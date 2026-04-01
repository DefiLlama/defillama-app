import { getErrorMessage } from '~/utils/error'
import type {
	ICategoriesAndTags,
	ICexItem,
	IChainMetadata,
	IProtocolMetadata,
	IRWAList,
	IRWAPerpsList,
	ITokenListEntry
} from './types'

type RawBridgeInfo = {
	id?: number
	name?: string
	displayName?: string
	slug?: string
	chains?: string[]
	destinationChain?: string
}

type RawBridgesResponse = {
	bridges?: RawBridgeInfo[]
}

type RawCexsResponse = {
	cexs: ICexItem[]
	cg_volume_cexs: string[]
}

type RawTokenListItem = ITokenListEntry & { id: string }

const normalizeSlug = (value: unknown): string =>
	String(value ?? '')
		.toLowerCase()
		.replace(/ /g, '-')
		.replace(/'/g, '')

const dedupeNonEmpty = (values: string[]): string[] => {
	const seen = new Set<string>()
	for (const value of values) {
		if (!value) continue
		seen.add(value)
	}
	return [...seen]
}

function previewResponseBody(body: string, length = 200): string {
	return body.replace(/\s+/g, ' ').trim().slice(0, length)
}

function sanitizeUrlForMetadataLogs(inputUrl: string): string {
	try {
		const parsed = new URL(inputUrl)
		let pathname = parsed.pathname

		// Normalize pro-api paths to avoid exposing API key segments.
		pathname = pathname.replace(/^\/[^/]+\/api(\/|$)/, '/').replace(/^\/api(\/|$)/, '/')
		pathname = pathname.replace(/^\/[^/]+\/rwa(\/|$)/, '/rwa$1')
		pathname = pathname.replace(/^\/[^/]+\/rwa-perps(\/|$)/, '/rwa-perps$1')
		pathname = pathname.replace(/^\/[^/]+\/bridges(\/|$)/, '/bridges$1')

		return `${pathname}${parsed.search}${parsed.hash}` || '/'
	} catch {
		return inputUrl
	}
}

async function fetchJson<T = any>(url: string): Promise<T> {
	const res = await fetch(url)
	const body = await res.text()
	const contentType = res.headers.get('content-type') ?? 'unknown'
	const urlToLog = sanitizeUrlForMetadataLogs(url)
	if (!res.ok) {
		throw new Error(
			`Metadata request failed for URL: ${urlToLog} (status ${res.status}). Body preview: "${previewResponseBody(body)}"`
		)
	}

	try {
		return JSON.parse(body) as T
	} catch (error) {
		throw new Error(
			`Failed to parse JSON for URL: ${urlToLog} (status ${res.status}, content-type ${contentType}). Body preview: "${previewResponseBody(
				body
			)}". Original error: ${getErrorMessage(error)}`
		)
	}
}

export async function fetchCoreMetadata(): Promise<{
	protocols: Record<string, IProtocolMetadata>
	chains: Record<string, IChainMetadata>
	categoriesAndTags: ICategoriesAndTags
	cexs: ICexItem[]
	rwaList: IRWAList
	rwaPerpsList: IRWAPerpsList
	tokenlist: Record<string, ITokenListEntry>
	cgExchangeIdentifiers: string[]
	bridgeProtocolSlugs: string[]
	bridgeChainSlugs: string[]
	bridgeChainSlugToName: Record<string, string>
}> {
	const API_KEY = process.env.API_KEY
	const API_SERVER_URL = API_KEY ? `https://pro-api.llama.fi/${API_KEY}/api` : 'https://api.llama.fi'
	const RWA_SERVER_URL = API_KEY ? `https://pro-api.llama.fi/${API_KEY}/rwa` : 'https://api.llama.fi/rwa'
	const RWA_PERPS_SERVER_URL =
		process.env.RWA_PERPS_SERVER_URL ??
		(API_KEY ? `https://pro-api.llama.fi/${API_KEY}/rwa-perps` : 'https://api.llama.fi/rwa-perps')
	const BRIDGES_SERVER_URL = API_KEY ? `https://pro-api.llama.fi/${API_KEY}/bridges` : 'https://bridges.llama.fi'
	const DATASETS_SERVER_URL = API_KEY
		? `https://pro-api.llama.fi/${API_KEY}/datasets`
		: 'https://defillama-datasets.llama.fi'

	const PROTOCOLS_DATA_URL = `${API_SERVER_URL}/config/smol/appMetadata-protocols.json`
	const CHAINS_DATA_URL = `${API_SERVER_URL}/config/smol/appMetadata-chains.json`
	const CATEGORIES_AND_TAGS_DATA_URL = `${API_SERVER_URL}/config/smol/appMetadata-categoriesAndTags.json`
	const CEXS_DATA_URL = `${API_SERVER_URL}/cexs`
	const RWA_LIST_DATA_URL = `${RWA_SERVER_URL}/list?rwa=123`
	const RWA_PERPS_LIST_DATA_URL = `${RWA_PERPS_SERVER_URL}/list`
	const TOKENLIST_DATA_URL = `${DATASETS_SERVER_URL}/tokenlist/sorted.json`
	const BRIDGES_DATA_URL = `${BRIDGES_SERVER_URL}/bridges?includeChains=true`

	const isDev = process.env.NODE_ENV === 'development'

	const fetchWithDevFallback = <T>(url: string, fallback: T): Promise<T> =>
		isDev
			? fetchJson<T>(url).catch((error) => {
					console.error(`[metadata] dev: failed to fetch ${sanitizeUrlForMetadataLogs(url)}, using fallback:`, error)
					return fallback
				})
			: fetchJson<T>(url)

	const [protocols, chains, categoriesAndTags, cexsResponse, rwaList, rwaPerpsList, tokenlistArray, bridgesResponse] =
		await Promise.all([
			fetchWithDevFallback<Record<string, IProtocolMetadata>>(PROTOCOLS_DATA_URL, {}),
			fetchWithDevFallback<Record<string, IChainMetadata>>(CHAINS_DATA_URL, {}),
			fetchWithDevFallback<ICategoriesAndTags>(CATEGORIES_AND_TAGS_DATA_URL, {
				categories: [],
				tags: [],
				tagCategoryMap: {}
			}),
			fetchWithDevFallback<RawCexsResponse>(CEXS_DATA_URL, { cexs: [], cg_volume_cexs: [] }),
			fetchWithDevFallback<IRWAList>(RWA_LIST_DATA_URL, {
				tickers: [],
				platforms: [],
				chains: [],
				categories: [],
				assetGroups: [],
				idMap: {}
			}),
			fetchWithDevFallback<IRWAPerpsList>(RWA_PERPS_LIST_DATA_URL, {
				coins: [],
				venues: [],
				categories: [],
				total: 0
			}),
			fetchWithDevFallback<RawTokenListItem[]>(TOKENLIST_DATA_URL, []),
			fetchWithDevFallback<RawBridgesResponse>(BRIDGES_DATA_URL, { bridges: [] })
		])

	const tokenlist: Record<string, ITokenListEntry> = {}
	for (const t of tokenlistArray) {
		if (!t || typeof t.id !== 'string' || !t.id) continue
		tokenlist[t.id] = {
			symbol: t.symbol,
			current_price: t.current_price ?? null,
			price_change_24h: t.price_change_24h ?? null,
			price_change_percentage_24h: t.price_change_percentage_24h ?? null,
			ath: t.ath ?? null,
			ath_date: t.ath_date ?? null,
			atl: t.atl ?? null,
			atl_date: t.atl_date ?? null,
			market_cap: t.market_cap ?? null,
			fully_diluted_valuation: t.fully_diluted_valuation ?? null,
			total_volume: t.total_volume ?? null,
			total_supply: t.total_supply ?? null,
			circulating_supply: t.circulating_supply ?? null,
			max_supply: t.max_supply ?? null
		}
	}

	const bridgeChainSlugToName: Record<string, string> = {}
	const bridgeProtocolSlugs = dedupeNonEmpty(
		(bridgesResponse?.bridges ?? []).flatMap((bridge) => {
			const fromApiSlug = normalizeSlug(bridge.slug)
			const fromDisplayName = normalizeSlug(bridge.displayName)
			if (!fromApiSlug && !fromDisplayName) return []
			return fromApiSlug ? [fromApiSlug, fromDisplayName] : [fromDisplayName]
		})
	)

	const bridgeChainSlugs = dedupeNonEmpty(
		(bridgesResponse?.bridges ?? []).flatMap((bridge) => {
			const destinationChain =
				bridge.destinationChain && bridge.destinationChain !== 'false' ? [bridge.destinationChain] : []
			const chainNames = [...(bridge.chains ?? []), ...destinationChain]
			for (const chainName of chainNames) {
				const normalized = normalizeSlug(chainName)
				if (!normalized || bridgeChainSlugToName[normalized]) continue
				bridgeChainSlugToName[normalized] = chainName
			}
			return chainNames.map(normalizeSlug)
		})
	)

	return {
		protocols,
		chains,
		categoriesAndTags,
		cexs: cexsResponse.cexs,
		cgExchangeIdentifiers: cexsResponse.cg_volume_cexs,
		rwaList,
		rwaPerpsList,
		tokenlist,
		bridgeProtocolSlugs,
		bridgeChainSlugs,
		bridgeChainSlugToName
	}
}
