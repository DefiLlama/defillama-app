import chainMetadata from '../../.cache/chains.json'
import protocolMetadata from '../../.cache/protocols.json'
import totalTrackedByMetric from '../../.cache/totalTrackedByMetric.json'

const PROTOCOLS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-protocols.json'
const CHAINS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-chains.json'
const TOTAL_TRACKED_BY_METRIC_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-totalTrackedByMetric.json'

interface IChainMetadata {
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
	id: string
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
	lending: { protocols: number; chains: number }
	treasury: { protocols: number; chains: number }
	emissions: { protocols: number; chains: number }
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

	const [protocols, chains, totalTrackedByMetric] = await Promise.all([
		fetchJson(PROTOCOLS_DATA_URL),
		fetchJson(CHAINS_DATA_URL),
		fetchJson(TOTAL_TRACKED_BY_METRIC_DATA_URL)
			.then((res) => res)
			.catch(() => ({}))
	])

	const protocolKeys = Object.keys(protocols)
	const chainKeys = Object.keys(chains)
	const protocolKeySet = new Set(protocolKeys)
	const chainKeySet = new Set(chainKeys)

	// Remove any keys that are no longer in the new data
	for (const key in metadataCache.protocolMetadata) {
		if (!protocolKeySet.has(key)) delete metadataCache.protocolMetadata[key]
	}

	for (const key in metadataCache.chainMetadata) {
		if (!chainKeySet.has(key)) delete metadataCache.chainMetadata[key]
	}

	// Add any new keys that are in the new data
	protocolKeys.forEach((key) => {
		metadataCache.protocolMetadata[key] = protocols[key]
	})

	chainKeys.forEach((key) => {
		metadataCache.chainMetadata[key] = chains[key]
	})

	metadataCache.totalTrackedByMetric = totalTrackedByMetric
}, 60 * 60 * 1000)

export default metadataCache
