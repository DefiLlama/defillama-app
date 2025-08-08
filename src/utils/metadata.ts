import chainMetadata from '../../.cache/chains.json'
import protocolMetadata from '../../.cache/protocols.json'
import categoriesAndTags from '../../.cache/categoriesAndTags.json'
import searchList from '../../.cache/searchList.json'
import { slug } from '~/utils'

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
	protocolCount?: number
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

const metadataCache: {
	chainMetadata: Record<string, IChainMetadata>
	protocolMetadata: Record<string, IProtocolMetadata>
	categoriesAndTags: {
		categories: Array<string>
		tags: Array<string>
	}
	searchList: Array<{ category: string; pages: Array<{ name: string; route: string }>; route: string }>
} = {
	chainMetadata,
	protocolMetadata,
	categoriesAndTags,
	searchList
}

setInterval(async () => {
	const fetchJson = async (url) => fetch(url).then((res) => res.json())

	const [protocols, chains, categoriesAndTags] = await Promise.all([
		fetchJson(PROTOCOLS_DATA_URL),
		fetchJson(CHAINS_DATA_URL),
		fetchJson(CATEGORIES_AND_TAGS_DATA_URL)
	])

	const searchList = generateSearchList({ protocols, chains, categoriesAndTags })

	metadataCache.protocolMetadata = protocols
	metadataCache.chainMetadata = chains
	metadataCache.categoriesAndTags = categoriesAndTags
	metadataCache.searchList = searchList
}, 60 * 60 * 1000)

export default metadataCache

function generateSearchList({ protocols, chains, categoriesAndTags }) {
	const searchList = {
		protocols: [],
		chains: [],
		categories: [],
		tags: []
	}

	for (const protocol in protocols) {
		if (!protocols[protocol].displayName) continue
		searchList.protocols.push({
			name: protocols[protocol].displayName,
			route: `/protocol/${slug(protocols[protocol].name)}`
		})
	}

	for (const chain in chains) {
		searchList.chains.push({ name: chains[chain].name, route: `/chain/${slug(chains[chain].name)}` })
	}

	for (const category of categoriesAndTags.categories) {
		searchList.categories.push({ name: category, route: `/category/${slug(category)}` })
	}

	for (const tag of categoriesAndTags.tags) {
		searchList.tags.push({ name: tag, route: `/tag/${slug(tag)}` })
	}

	const finalSearchList = [
		{ category: 'Protocols', pages: searchList.protocols, route: '/protocols' },
		{ category: 'Chains', pages: searchList.chains, route: '/chains' },
		{ category: 'Categories', pages: searchList.categories, route: '/categories' },
		{ category: 'Tags', pages: searchList.tags, route: '/categories' }
	]

	return finalSearchList
}
