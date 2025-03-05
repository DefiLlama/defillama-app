// to change metadata info, update this file in server repo: 
// https://github.com/DefiLlama/defillama-server/blob/master/defi/src/api2/cron-task/appMetadata.ts


import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const CACHE_DIR = path.join(__dirname, '../.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'lastPull.json');
const PROTOCOLS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-protocols.json';
const CHAINS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-chains.json';
const FIVE_MINUTES = 5 * 60 * 1000;

const fetchJson = async (url) => fetch(url).then((res) => res.json())

async function pullData() {
  try {
    const protocols = await fetchJson(PROTOCOLS_DATA_URL);
    const chains = await fetchJson(CHAINS_DATA_URL);

    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR);
    }

    fs.writeFileSync(path.join(CACHE_DIR, 'chains.json'), JSON.stringify(chains));
    fs.writeFileSync(path.join(CACHE_DIR, 'protocols.json'), JSON.stringify(protocols));
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ lastPull: Date.now() }, null, 2));

    console.log('Data pulled and cached successfully.');
  } catch (error) {
    console.error('Error pulling data:', error);
  }
}

function shouldPullData() {
  if (!fs.existsSync(CACHE_FILE)) {
    return true;
  }

  const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  const lastPull = cacheData.lastPull;

  return Date.now() - lastPull > FIVE_MINUTES;
}

if (shouldPullData()) {
  pullData();
} else {
  console.log('Metadata was pulled recently. No need to pull again.');
}