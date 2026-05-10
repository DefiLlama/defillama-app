import { ENABLE_LLAMASWAP_PROTOCOLS_CHAINS, LIQUIDATIONS_SERVER_URL_V2, TOKEN_DIRECTORY_API } from '~/constants'
import type { RawAllLiquidationsResponse } from '~/containers/LiquidationsV2/api.types'
import { fetchEmissionsProtocolsList } from '~/containers/Unlocks/api'
import { getErrorMessage } from '~/utils/error'
import { fetchWithPoolingOnServer } from '~/utils/http-client'
import { previewResponseBody, sanitizeDefiLlamaProApiUrl } from '~/utils/http-error-format'
import { recordRuntimeError } from '~/utils/telemetry'
import type { TokenDirectory } from '~/utils/tokenDirectory'
import type { CoreMetadataPayload } from './artifactContract'
import { buildProtocolLlamaswapDataset } from './buy-on-llamaswap'
import { buildChainDisplayNameLookupRecord, buildProtocolDisplayNameLookupRecord } from './displayLookups'
import { extractLiquidationsTokenSymbols } from './liquidations'
import type {
	ICategoriesAndTags,
	ICexItem,
	IChainMetadata,
	IProtocolMetadata,
	IRWAList,
	IRWAPerpsList,
	ITokenListEntry,
	ProtocolLlamaswapMetadata
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

const DEFAULT_METADATA_FETCH_TIMEOUT_MS = 180_000

const normalizeSlug = (value: unknown): string =>
	String(value ?? '')
		.toLowerCase()
		.replace(/ /g, '-')
		.replace(/'/g, '')

function getMetadataFetchTimeoutMs(): number {
	const raw = process.env.METADATA_FETCH_TIMEOUT_MS
	if (raw == null) return DEFAULT_METADATA_FETCH_TIMEOUT_MS

	const parsed = Number(raw)
	return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_METADATA_FETCH_TIMEOUT_MS
}

const dedupeNonEmpty = (values: string[]): string[] => {
	const seen = new Set<string>()
	for (const value of values) {
		if (!value) continue
		seen.add(value)
	}
	return [...seen]
}

function sanitizeUrlForMetadataLogs(inputUrl: string): string {
	return sanitizeDefiLlamaProApiUrl(inputUrl)
}

async function fetchJson<T = any>(url: string): Promise<T> {
	const res = await fetchWithPoolingOnServer(url, { timeout: getMetadataFetchTimeoutMs() })
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

export async function fetchCoreMetadata({
	existingProtocolLlamaswapDataset
}: {
	existingProtocolLlamaswapDataset?: ProtocolLlamaswapMetadata
} = {}): Promise<CoreMetadataPayload> {
	const API_KEY = process.env.API_KEY
	const API_SERVER_URL = API_KEY ? `https://pro-api.llama.fi/${API_KEY}/api` : 'https://api.llama.fi'
	const RWA_SERVER_URL = API_KEY ? `https://pro-api.llama.fi/${API_KEY}/rwa` : 'https://api.llama.fi/rwa'
	const RWA_PERPS_SERVER_URL = API_KEY
		? `https://pro-api.llama.fi/${API_KEY}/rwa-perps`
		: 'https://api.llama.fi/rwa-perps'
	const BRIDGES_SERVER_URL = API_KEY ? `https://pro-api.llama.fi/${API_KEY}/bridges` : 'https://bridges.llama.fi'
	const DATASETS_SERVER_URL = API_KEY
		? `https://pro-api.llama.fi/${API_KEY}/datasets`
		: 'https://defillama-datasets.llama.fi'
	const LIQUIDATIONS_DATA_URL = `${LIQUIDATIONS_SERVER_URL_V2}/all?zz=14`

	const PROTOCOLS_DATA_URL = `${API_SERVER_URL}/config/smol/appMetadata-protocols.json?zz=14`
	const CHAINS_DATA_URL = `${API_SERVER_URL}/config/smol/appMetadata-chains.json?zz=14`
	const CATEGORIES_AND_TAGS_DATA_URL = `${API_SERVER_URL}/config/smol/appMetadata-categoriesAndTags.json?zz=14`
	const CEXS_DATA_URL = `${API_SERVER_URL}/cexs?zz=14`
	const RWA_LIST_DATA_URL = `${RWA_SERVER_URL}/list?zz=14`
	const RWA_PERPS_LIST_DATA_URL = `${RWA_PERPS_SERVER_URL}/list?zz=14`
	const TOKENLIST_DATA_URL = `${DATASETS_SERVER_URL}/tokenlist/sorted.json?zz=14`
	const BRIDGES_DATA_URL = `${BRIDGES_SERVER_URL}/bridges?includeChains=true`

	const isDev = process.env.NODE_ENV === 'development'

	const fetchWithDevFallback = <T>(url: string, fallback: T): Promise<T> =>
		isDev
			? fetchJson<T>(url).catch((error) => {
					recordRuntimeError(error, 'pageBuild')
					return fallback
				})
			: fetchJson<T>(url)

	const [
		protocols,
		chains,
		categoriesAndTags,
		cexsResponse,
		rwaList,
		rwaPerpsList,
		tokenlistArray,
		tokenDirectory,
		liquidationsResponse,
		bridgesResponse
	] = await Promise.all([
		fetchWithDevFallback<Record<string, IProtocolMetadata>>(PROTOCOLS_DATA_URL, {}),
		fetchWithDevFallback<Record<string, IChainMetadata>>(CHAINS_DATA_URL, {}),
		fetchWithDevFallback<ICategoriesAndTags>(CATEGORIES_AND_TAGS_DATA_URL, {
			categories: [],
			tags: [],
			tagCategoryMap: {},
			configs: {}
		}),
		fetchWithDevFallback<RawCexsResponse>(CEXS_DATA_URL, { cexs: [], cg_volume_cexs: [] }),
		fetchWithDevFallback<IRWAList>(RWA_LIST_DATA_URL, {
			canonicalMarketIds: [],
			platforms: [],
			chains: [],
			categories: [],
			assetGroups: [],
			idMap: {}
		}),
		fetchWithDevFallback<IRWAPerpsList>(RWA_PERPS_LIST_DATA_URL, {
			contracts: [],
			venues: [],
			categories: [],
			assetGroups: [],
			total: 0
		}),
		fetchWithDevFallback<RawTokenListItem[]>(TOKENLIST_DATA_URL, []),
		fetchWithDevFallback<TokenDirectory>(TOKEN_DIRECTORY_API, {}),
		fetchWithDevFallback<RawAllLiquidationsResponse>(LIQUIDATIONS_DATA_URL, {
			data: {},
			tokens: {},
			validThresholds: [],
			timestamp: 0
		}),
		fetchWithDevFallback<RawBridgesResponse>(BRIDGES_DATA_URL, { bridges: [] })
	])

	const emissionsProtocolsList = await (isDev
		? fetchEmissionsProtocolsList({ timeout: getMetadataFetchTimeoutMs() }).catch((error) => {
				recordRuntimeError(error, 'pageBuild')
				return []
			})
		: fetchEmissionsProtocolsList({ timeout: getMetadataFetchTimeoutMs() }))

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

	const protocolLlamaswapDataset = ENABLE_LLAMASWAP_PROTOCOLS_CHAINS
		? await (isDev
				? buildProtocolLlamaswapDataset({ chains, protocols, existingDataset: existingProtocolLlamaswapDataset }).catch(
						(error) => {
							recordRuntimeError(error, 'pageBuild')
							return {} as ProtocolLlamaswapMetadata
						}
					)
				: buildProtocolLlamaswapDataset({ chains, protocols, existingDataset: existingProtocolLlamaswapDataset }))
		: ({} as ProtocolLlamaswapMetadata)

	const protocolDisplayNames = buildProtocolDisplayNameLookupRecord(protocols)
	const chainDisplayNames = buildChainDisplayNameLookupRecord(chains)
	const liquidationsTokenSymbols = extractLiquidationsTokenSymbols(liquidationsResponse)

	return {
		protocols,
		chains,
		categoriesAndTags,
		cexs: cexsResponse.cexs,
		cgExchangeIdentifiers: cexsResponse.cg_volume_cexs,
		rwaList,
		rwaPerpsList,
		tokenlist,
		tokenDirectory,
		protocolDisplayNames,
		chainDisplayNames,
		liquidationsTokenSymbols,
		emissionsProtocolsList,
		bridgeProtocolSlugs,
		bridgeChainSlugs,
		bridgeChainSlugToName,
		protocolLlamaswapDataset
	}
}
