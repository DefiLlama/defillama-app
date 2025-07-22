import chainMetadata from '../../.cache/chains.json'
import protocolMetadata from '../../.cache/protocols.json'
import categoriesAndTags from '../../.cache/categoriesAndTags.json'

const PROTOCOLS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-protocols.json'
const CHAINS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-chains.json'
const CATEGORIES_AND_TAGS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-categoriesAndTags.json'

interface IChainMetadata {
	stablecoins?: boolean
	dexs?: boolean
	name: string
	activeUsers?: boolean
	fees?: boolean
	chainFees?: boolean
	perps?: boolean
	dexAggregators?: boolean
	options?: boolean
	perpsAggregators?: boolean
	bridgeAggregators?: boolean
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
	dexAggregators?: boolean
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
	bridges?: boolean
	stablecoins?: boolean
}

const metadataCache: {
	chainMetadata: Record<string, IChainMetadata>
	protocolMetadata: Record<string, IProtocolMetadata>
	categoriesAndTags: {
		categories: Array<string>
		tags: Array<string>
	}
} = {
	chainMetadata,
	protocolMetadata,
	categoriesAndTags
}

setInterval(async () => {
	const fetchJson = async (url) => fetch(url).then((res) => res.json())

	const [protocols, chains, categoriesAndTags] = await Promise.all([
		fetchJson(PROTOCOLS_DATA_URL),
		fetchJson(CHAINS_DATA_URL),
		fetchJson(CATEGORIES_AND_TAGS_DATA_URL)
	])

	metadataCache.protocolMetadata = protocols
	metadataCache.chainMetadata = chains
	metadataCache.categoriesAndTags = categoriesAndTags
}, 60 * 60 * 1000)

export default metadataCache
