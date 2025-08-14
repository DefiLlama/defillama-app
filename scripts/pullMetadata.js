// to change metadata info, update this file in server repo:
// https://github.com/DefiLlama/defillama-server/blob/master/defi/src/api2/cron-task/appMetadata.ts

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = path.join(__dirname, '../.cache')
const CACHE_FILE = path.join(CACHE_DIR, 'lastPull.json')
const PROTOCOLS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-protocols.json'
const CHAINS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-chains.json'
const CATEGORIES_AND_TAGS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-categoriesAndTags.json'
const CEXS_DATA_URL = 'https://api.llama.fi/cexs'
const FIVE_MINUTES = 5 * 60 * 1000

const fetchJson = async (url) => fetch(url).then((res) => res.json())

async function pullData() {
	try {
		const [protocols, chains, categoriesAndTags, cexs] = await Promise.all([
			fetchJson(PROTOCOLS_DATA_URL),
			fetchJson(CHAINS_DATA_URL),
			fetchJson(CATEGORIES_AND_TAGS_DATA_URL),
			fetchJson(CEXS_DATA_URL)
				.then((data) => data.cexs ?? [])
				.catch(() => [])
		])

		if (!fs.existsSync(CACHE_DIR)) {
			fs.mkdirSync(CACHE_DIR)
		}

		fs.writeFileSync(path.join(CACHE_DIR, 'chains.json'), JSON.stringify(chains))
		fs.writeFileSync(path.join(CACHE_DIR, 'protocols.json'), JSON.stringify(protocols))
		fs.writeFileSync(path.join(CACHE_DIR, 'categoriesAndTags.json'), JSON.stringify(categoriesAndTags))
		fs.writeFileSync(path.join(CACHE_DIR, 'cexs.json'), JSON.stringify(cexs))
		fs.writeFileSync(CACHE_FILE, JSON.stringify({ lastPull: Date.now() }, null, 2))

		console.log('Data pulled and cached successfully.')
		return true
	} catch (error) {
		console.error('Error pulling data:', error)
		process.exit(1) // Exit with error code
	}
}

function shouldPullData() {
	if (!fs.existsSync(CACHE_FILE)) {
		return true
	}

	const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'))
	const lastPull = cacheData.lastPull

	return Date.now() - lastPull > FIVE_MINUTES
}

if (shouldPullData()) {
	pullData()
		.then(() => {
			process.exit(0) // Exit successfully
		})
		.catch((error) => {
			console.error('Fatal error:', error)
			process.exit(1) // Exit with error code
		})
} else {
	console.log('Metadata was pulled recently. No need to pull again.')
	process.exit(0) // Exit successfully
}
