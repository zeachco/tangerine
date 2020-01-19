import path from 'path';
import { tangerine } from '..';

async function runExample() {
  try {
    const creds = require(path.join(process.cwd(), 'login.json'));
    await tangerine.login(creds);
    const accounts = await tangerine.list_accounts();
    console.dir({ accounts });
  } catch (err) {
    console.error(err);
  }
}

runExample();
