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
	tvl: number
	stablecoins: number
	fees: number
	revenue: number
	holdersRevenue: number
	dexs: number
	dexAggregators: number
	perps: number
	perpAggregators: number
	options: number
	bridgeAggregators: number
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
		.then((res) => res.peggedAssets.length)
		.catch(() => 0)

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
		tvl: 0,
		stablecoins,
		fees: 0,
		revenue: 0,
		holdersRevenue: 0,
		dexs: 0,
		dexAggregators: 0,
		perps: 0,
		perpAggregators: 0,
		options: 0,
		bridgeAggregators: 0
	}

	for (const p in metadataCache.protocolMetadata) {
		const protocol = metadataCache.protocolMetadata[p]
		if (protocol.tvl) {
			totalTrackedByMetric.tvl += 1
		}
		if (protocol.fees) {
			totalTrackedByMetric.fees += 1
		}
		if (protocol.revenue) {
			totalTrackedByMetric.revenue += 1
		}
		if (protocol.holdersRevenue) {
			totalTrackedByMetric.holdersRevenue += 1
		}
		if (protocol.dexs) {
			totalTrackedByMetric.dexs += 1
		}
		if (protocol.aggregator) {
			totalTrackedByMetric.dexAggregators += 1
		}
		if (protocol.perps) {
			totalTrackedByMetric.perps += 1
		}
		if (protocol.perpsAggregators) {
			totalTrackedByMetric.perpAggregators += 1
		}
		if (protocol.options) {
			totalTrackedByMetric.options += 1
		}
		if (protocol.bridgeAggregators) {
			totalTrackedByMetric.bridgeAggregators += 1
		}
	}

	metadataCache.totalTrackedByMetric = totalTrackedByMetric
}, 60 * 60 * 1000)

export default metadataCache
