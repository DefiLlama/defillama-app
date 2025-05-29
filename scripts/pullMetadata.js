// to change metadata info, update this file in server repo:
// https://github.com/DefiLlama/defillama-server/blob/master/defi/src/api2/cron-task/appMetadata.ts

import fs from 'fs'
import path from 'path'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const CACHE_DIR = path.join(__dirname, '../.cache')
const CACHE_FILE = path.join(CACHE_DIR, 'lastPull.json')
const PROTOCOLS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-protocols.json'
const CHAINS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-chains.json'
const STABLECOINS_DATA_URL = 'https://stablecoins.llama.fi/stablecoins'
const PROTOCOLS_LIST = 'https://api.llama.fi/lite/protocols2'
const TREASURY_DATA_URL = 'https://api.llama.fi/treasuries'
const FIVE_MINUTES = 5 * 60 * 1000

const fetchJson = async (url) => fetch(url).then((res) => res.json())

async function pullData() {
	try {
		const [protocols, chains, lending, stablecoins, treasury] = await Promise.all([
			fetchJson(PROTOCOLS_DATA_URL),
			fetchJson(CHAINS_DATA_URL),
			fetchJson(PROTOCOLS_LIST)
				.then((res) => res.protocols.filter((p) => p.category === 'Lending'))
				.then((r) => ({ protocols: r.length, chains: 0 }))
				.catch(() => ({ protocols: 0, chains: 0 })),
			fetchJson(STABLECOINS_DATA_URL)
				.then((res) => ({ protocols: res.peggedAssets.length, chains: res.chains.length }))
				.catch(() => ({ protocols: 0, chains: 0 })),
			fetchJson(TREASURY_DATA_URL)
				.then((res) => ({ protocols: res.length, chains: 0 }))
				.catch(() => ({ protocols: 0, chains: 0 }))
		])

		if (!fs.existsSync(CACHE_DIR)) {
			fs.mkdirSync(CACHE_DIR)
		}

		fs.writeFileSync(path.join(CACHE_DIR, 'chains.json'), JSON.stringify(chains))
		fs.writeFileSync(path.join(CACHE_DIR, 'protocols.json'), JSON.stringify(protocols))
		fs.writeFileSync(CACHE_FILE, JSON.stringify({ lastPull: Date.now() }, null, 2))

		const totalTrackedByMetric = {
			tvl: { protocols: 0, chains: 0 },
			stablecoins,
			fees: { protocols: 0, chains: 0 },
			revenue: { protocols: 0, chains: 0 },
			holdersRevenue: { protocols: 0, chains: 0 },
			dexs: { protocols: 0, chains: 0 },
			dexAggregators: { protocols: 0, chains: 0 },
			perps: { protocols: 0, chains: 0 },
			perpAggregators: { protocols: 0, chains: 0 },
			options: { protocols: 0, chains: 0 },
			bridgeAggregators: { protocols: 0, chains: 0 },
			lending,
			treasury
		}

		for (const p in protocols) {
			const protocol = protocols[p]
			if (protocol.tvl) {
				totalTrackedByMetric.tvl.protocols += 1
			}
			if (protocol.fees) {
				totalTrackedByMetric.fees.protocols += 1
			}
			if (protocol.revenue) {
				totalTrackedByMetric.revenue.protocols += 1
			}
			if (protocol.holdersRevenue) {
				totalTrackedByMetric.holdersRevenue.protocols += 1
			}
			if (protocol.dexs) {
				totalTrackedByMetric.dexs.protocols += 1
			}
			if (protocol.aggregator) {
				totalTrackedByMetric.dexAggregators.protocols += 1
			}
			if (protocol.perps) {
				totalTrackedByMetric.perps.protocols += 1
			}
			if (protocol.perpsAggregators) {
				totalTrackedByMetric.perpAggregators.protocols += 1
			}
			if (protocol.options) {
				totalTrackedByMetric.options.protocols += 1
			}
			if (protocol.bridgeAggregators) {
				totalTrackedByMetric.bridgeAggregators.protocols += 1
			}
		}

		for (const pc in chains) {
			const chain = chains[pc]

			totalTrackedByMetric.tvl.chains += 1

			if (chain.stablecoins) {
				totalTrackedByMetric.stablecoins.chains += 1
			}
			if (chain.fees) {
				totalTrackedByMetric.fees.chains += 1
				totalTrackedByMetric.revenue.chains += 1
				totalTrackedByMetric.holdersRevenue.chains += 1
			}
			if (chain.dexs) {
				totalTrackedByMetric.dexs.chains += 1
			}
			if (chain.aggregators) {
				totalTrackedByMetric.dexAggregators.chains += 1
			}
			if (chain.derivatives) {
				totalTrackedByMetric.perps.chains += 1
			}
			if (chain['aggregator-derivatives']) {
				totalTrackedByMetric.perpAggregators.chains += 1
			}
			if (chain.options) {
				totalTrackedByMetric.options.chains += 1
			}
			if (chain['bridge-aggregators']) {
				totalTrackedByMetric.bridgeAggregators.chains += 1
			}
		}

		fs.writeFileSync(path.join(CACHE_DIR, 'totalTrackedByMetric.json'), JSON.stringify(totalTrackedByMetric))

		console.log('Data pulled and cached successfully.')
	} catch (error) {
		console.error('Error pulling data:', error)
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
} else {
	console.log('Metadata was pulled recently. No need to pull again.')
}
