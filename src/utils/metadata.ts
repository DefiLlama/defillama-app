import categoriesAndTags from '../../.cache/categoriesAndTags.json'
import cexs from '../../.cache/cexs.json'
import chainMetadata from '../../.cache/chains.json'
import protocolMetadata from '../../.cache/protocols.json'

const PROTOCOLS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-protocols.json'
const CHAINS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-chains.json'
const CATEGORIES_AND_TAGS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-categoriesAndTags.json'
const CEXS_DATA_URL = 'https://api.llama.fi/cexs'

interface IChainMetadata {
	stablecoins?: boolean
	dexs?: boolean
	name: string
	activeUsers?: boolean
	fees?: boolean
	revenue?: boolean
	chainFees?: boolean
	chainRevenue?: boolean
	perps?: boolean
	dexAggregators?: boolean
	optionsPremiumVolume?: boolean
	optionsNotionalVolume?: boolean
	perpsAggregators?: boolean
	bridgeAggregators?: boolean
	inflows?: boolean
	chainAssets?: boolean
	gecko_id?: string
	tokenSymbol?: string
	github?: boolean
	id: string
	protocolCount?: number
	incentives?: boolean
}

interface IProtocolMetadata {
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

interface ICexItem {
	name: string
	slug?: string
	coin?: string | null
	coinSymbol?: string | null
	walletsLink?: string | null
	cgId?: string | null
	cgDeriv?: string | null
	lastAuditDate?: number
	auditor?: string | null
	auditLink?: string | null
}

const metadataCache: {
	chainMetadata: Record<string, IChainMetadata>
	protocolMetadata: Record<string, IProtocolMetadata>
	categoriesAndTags: {
		categories: Array<string>
		tags: Array<string>
	}
	cexs: Array<ICexItem>
} = {
	chainMetadata,
	protocolMetadata,
	categoriesAndTags,
	cexs
}

setInterval(
	async () => {
		const fetchJson = async (url) => fetch(url).then((res) => res.json())

		const [protocols, chains, categoriesAndTags, cexData] = await Promise.all([
			fetchJson(PROTOCOLS_DATA_URL),
			fetchJson(CHAINS_DATA_URL),
			fetchJson(CATEGORIES_AND_TAGS_DATA_URL),
			fetchJson(CEXS_DATA_URL)
		])

		metadataCache.protocolMetadata = protocols
		metadataCache.chainMetadata = chains
		metadataCache.categoriesAndTags = categoriesAndTags
		metadataCache.cexs = cexData.cexs
	},
	60 * 60 * 1000
)

export default metadataCache
