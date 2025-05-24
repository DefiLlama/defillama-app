import chainMetadata from '../../.cache/chains.json'
import protocolMetadata from '../../.cache/protocols.json'
import totalTrackedByMetric from '../../.cache/totalTrackedByMetric.json'

const PROTOCOLS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-protocols.json'
const CHAINS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-chains.json'
const STABLECOINS_DATA_URL = 'https://stablecoins.llama.fi/stablecoins'

interface IChainMetadata {
	tvl?: boolean
	stablecoins?: boolean
	dexs?: boolean
	name: string
	activeUsers?: boolean
	fees?: boolean
	chainFees?: boolean
	derivatives?: boolean
	aggregators?: boolean
	options?: boolean
	'aggregator-derivatives'?: boolean
	'bridge-aggregators'?: boolean
	inflows?: boolean
	chainAssets?: boolean
	gecko_id?: string
	tokenSymbol?: string
	github?: boolean
}

interface IProtocolMetadata {
	name?: string
	tvl?: boolean
	yields?: boolean
	forks?: boolean
	liquidity?: boolean
	raises?: boolean
	fees?: boolean
	revenue?: boolean
	holdersRevenue?: boolean
	dexs?: boolean
	perps?: boolean
	aggregator?: boolean
	options?: boolean
	perpsAggregators?: boolean
	bridgeAggregators?: boolean
	displayName?: string
	chains?: Array<string>
	hacks?: boolean
	activeUsers?: boolean
	governance?: boolean
	expenses?: boolean
	treasury?: boolean
	nfts?: boolean
	emissions?: boolean
	bribeRevenue?: boolean
	tokenTax?: boolean
}

interface ITotalTrackedByMetric {
	tvl: { protocols: number; chains: number }
	stablecoins: { protocols: number; chains: number }
	fees: { protocols: number; chains: number }
	revenue: { protocols: number; chains: number }
	holdersRevenue: { protocols: number; chains: number }
	dexs: { protocols: number; chains: number }
	dexAggregators: { protocols: number; chains: number }
	perps: { protocols: number; chains: number }
	perpAggregators: { protocols: number; chains: number }
	options: { protocols: number; chains: number }
	bridgeAggregators: { protocols: number; chains: number }
}

const metadataCache: {
	chainMetadata: Record<string, IChainMetadata>
	protocolMetadata: Record<string, IProtocolMetadata>
	totalTrackedByMetric: ITotalTrackedByMetric
} = {
	chainMetadata,
	protocolMetadata,
	totalTrackedByMetric
}

setInterval(async () => {
	const fetchJson = async (url) => fetch(url).then((res) => res.json())

	const protocols = await fetchJson(PROTOCOLS_DATA_URL)
	const chains = await fetchJson(CHAINS_DATA_URL)
	const stablecoins = await fetchJson(STABLECOINS_DATA_URL)
		.then((res) => ({ protocols: res.peggedAssets.length as number, chains: res.chains.length as number }))
		.catch(() => ({ protocols: 0, chains: 0 }))

	const protocolKeys = Object.keys(protocols)
	const chainKeys = Object.keys(chains)
	const protocolKeySet = new Set(protocolKeys)
	const chainKeySet = new Set(chainKeys)

	// Remove any keys that are no longer in the new data
	Object.keys(metadataCache.protocolMetadata).forEach((key) => {
		if (!protocolKeySet.has(key)) delete metadataCache.protocolMetadata[key]
	})

	Object.keys(metadataCache.chainMetadata).forEach((key) => {
		if (!chainKeySet.has(key)) delete metadataCache.chainMetadata[key]
	})

	// Add any new keys that are in the new data
	protocolKeys.forEach((key) => {
		metadataCache.protocolMetadata[key] = protocols[key]
	})
	chainKeys.forEach((key) => {
		metadataCache.chainMetadata[key] = chains[key]
	})

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
		bridgeAggregators: { protocols: 0, chains: 0 }
	}

	for (const p in metadataCache.protocolMetadata) {
		const protocol = metadataCache.protocolMetadata[p]
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

	for (const pc in metadataCache.chainMetadata) {
		const chain = metadataCache.chainMetadata[pc]

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

	metadataCache.totalTrackedByMetric = totalTrackedByMetric
}, 60 * 60 * 1000)

export default metadataCache
