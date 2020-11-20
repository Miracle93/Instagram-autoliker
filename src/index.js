import dotenv from 'dotenv';

import Liker from './Liker';

dotenv.config();

const liker = new Liker();

async function shutdown() {
  await liker.quit();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// eslint-disable-next-line func-names
(async function main() {
  try {
    await liker.build();
    await liker.login();
    await liker.infinityStrategy();
  } catch (error) {
    console.error(error);
  } finally {
    await shutdown();
  }
})();
