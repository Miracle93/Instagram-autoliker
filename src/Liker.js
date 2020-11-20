import path from 'path';

import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

import { sleep } from './utils';

export default class Liker {
  driver = null;

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
      await this.driver.get('https://www.instagram.com/');

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
    } catch (error) {
      throw new Error(`Login error: ${error.message}`);
    }
  }

  async infinityStrategy() {
    await this.driver.get('https://www.instagram.com/');

    const isRunning = true;

    const posts = await this.driver.findElements(
      By.css('article[role=presentation]'),
    );

    /* eslint-disable no-await-in-loop */
    for (const post of posts) {
      const like = await post.findElement(By.css('svg[aria-label="Нравится"]'));

      await this.driver.executeScript(
        'arguments[0].scrollIntoView(true);',
        like,
      );

      await sleep(2000);

      // await like.click();
    }
    /* eslint-enable no-await-in-loop */
  }

  async isLogged() {
    try {
      await this.driver.findElement(By.className('logged-in'));

      return true;
    } catch (error) {
      return false;
    }
  }

  async quit() {
    this.driver.quit();
  }
}
