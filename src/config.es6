import path from 'path';
import fs from 'fs';
import {promisify} from 'bluebird';
import {info} from './log';

const readFile = promisify(fs.readFile);
const {CONFIG_FILE} = process.env;
const DEFAULT_CONFIG_FILE = path.join(__dirname, '../config.json');

export default async function resolveConfig() {
  if (CONFIG_FILE) {
    info(`reading config from file ${CONFIG_FILE}`);
    return await fileSource(CONFIG_FILE);
  } else if (fs.existsSync(DEFAULT_CONFIG_FILE)) {
    info(`reading config from file ${DEFAULT_CONFIG_FILE}`);
    return await fileSource(DEFAULT_CONFIG_FILE);
  } else {
    info('trying to compose config from env variables');
    return await envSource();
  }
}

async function fileSource(filePath) {
  const contents = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(contents);
  return parsed;
}

async function envSource() {
  const {
    RANCHER_ADDRESS,
    RANCHER_ACCESS_KEY,
    RANCHER_SECRET_KEY,
    RANCHER_PROJECT_ID
  } = process.env;

  return {
    rancher: {
      address: RANCHER_ADDRESS,
      auth: {
        accessKey: RANCHER_ACCESS_KEY,
        secretKey: RANCHER_SECRET_KEY
      },
      projectId: RANCHER_PROJECT_ID
    },
    pollServicesInterval: 10000
  }
}
