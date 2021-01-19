import path from 'path';

import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

import { generatorBind, getRandomInRange, sleep } from './utils';

export default class Liker {
  driver = null;

  baseUrl = 'https://www.instagram.com/';

  likeCount = 0;

  startTime = new Date().getTime() / 1000;

  // eslint-disable-next-line class-methods-use-this
  infinityStrategy() {
    return function* () {
      while (true) yield;
    };
  }

  // eslint-disable-next-line class-methods-use-this
  likeLimitStrategy() {
    if (!process.env.LIKE_LIMIT) {
      throw new Error('LIKE_LIMIT is required for this strategy');
    }

    return function* () {
      while (this.likeCount < Number(process.env.LIKE_LIMIT)) {
        yield;
      }
    };
  }

  // eslint-disable-next-line class-methods-use-this
  timeLimitStrategy() {
    if (!process.env.TIME_LIMIT) {
      throw new Error('TIME_LIMIT is required for this strategy');
    }

    return function* () {
      let isRunning = true;

      while (isRunning) {
        const currentTime = new Date().getTime() / 1000;

        isRunning =
          currentTime - this.startTime <= Number(process.env.TIME_LIMIT);

        yield;
      }
    };
  }

  getStrategyGenerator() {
    switch (process.env.STRATEGY) {
      case 'infinity':
        return this.infinityStrategy();
      case 'like limit':
        return generatorBind(this, this.likeLimitStrategy());
      case 'time limit':
        return generatorBind(this, this.timeLimitStrategy());
      default:
        throw new Error(
          'Strategy not found. Please specify the "STRATEGY" environment variable. Available strategies: "infinity", "like limit", "time limit',
        );
    }
  }

  async quit() {
    this.driver.quit();
  }

  async isLogged() {
    try {
      await this.driver.findElement(By.className('logged-in'));

      return true;
    } catch (error) {
      return false;
    }
  }

  async goToHomePage() {
    if ((await this.driver.getCurrentUrl()) !== this.baseUrl) {
      await this.driver.get(this.baseUrl);
    }
  }

  async setLike(post) {
    try {
      const like = await post.findElement(By.css('svg[aria-label="Нравится"]'));

      await this.driver.executeScript(
        'arguments[0].scrollIntoView({ block: "center", behavior: "smooth" });',
        like,
      );
      await this.driver.executeScript(
        'arguments[0].setAttribute("data-view", "viewed")',
        post,
      );

      await like.click();

      this.likeCount += 1;

      await sleep(
        getRandomInRange(
          Number(process.env.SLEEP_MIN),
          Number(process.env.SLEEP_MAX),
        ),
      );
    } catch (error) {
      if (error.name !== 'NoSuchElementError') throw error;
    }
  }

  async build() {
    try {
      const chromeService = new chrome.ServiceBuilder(
        path.win32.resolve(__dirname, '../webdriver/chromedriver.exe'),
      );

      chrome.setDefaultService(chromeService.build());

      this.driver = await new Builder()
        .withCapabilities({
          chromeOptions: {
            args: [
              'disable-infobars',
              `user-data-dir=${path.win32.resolve(
                __dirname,
                '../chrome-profile',
              )}`,
            ],
            w3c: false,
          },
        })
        .forBrowser('chrome')
        .build();
    } catch (error) {
      throw new Error(`Build error: ${error.message}`);
    }
  }

  async login() {
    try {
      await this.goToHomePage();

      if (!(await this.isLogged())) {
        const loginForm = await this.driver.wait(
          until.elementLocated(By.id('loginForm')),
          3000,
        );
        const login = await loginForm.findElement(By.name('username'));
        const password = await loginForm.findElement(By.name('password'));

        await login.sendKeys(process.env.LOGIN);
        await password.sendKeys(process.env.PASSWORD);
        await loginForm.submit();
      }

      await this.driver.wait(
        until.elementLocated(By.className('logged-in')),
        3000,
      );
    } catch (error) {
      throw new Error(`Login error: ${error.message}`);
    }
  }

  async run() {
    try {
      await this.goToHomePage();

      const generator = this.getStrategyGenerator();

      /* eslint-disable no-await-in-loop */
      // eslint-disable-next-line no-unused-vars
      for (const _ of generator()) {
        const posts = await this.driver.findElements(
          By.css('article[role=presentation]:not([data-view=viewed])'),
        );

        /* eslint-disable no-await-in-loop */
        for (const post of posts) {
          await this.setLike(post);
        }
        /* eslint-enable no-await-in-loop */
      }
    } catch (error) {
      throw new Error(`Something went wrong while running: ${error.message}`);
    }
  }

  async start() {
    await this.build();
    await this.login();
    await this.run();
  }
}
