import { getDirectUrlEnv } from '~/utils/directApi'

const API_KEY = process.env.API_KEY
export const PRO_API_BASE_URL =
	process.env.NODE_ENV === 'production' && process.env.PRO_API_URL
		? process.env.PRO_API_URL
		: 'https://pro-api.llama.fi'
export const COINGECKO_KEY = process.env.CG_KEY
export const SEARCH_API_TOKEN = process.env.NEXT_PUBLIC_SEARCH_API_TOKEN
export const SKIP_BUILD_STATIC_GENERATION = !['false', '0'].includes(process.env.SKIP_BUILD_STATIC_GENERATION)
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''

// Base servers
export const AUTH_SERVER = process.env.NEXT_PUBLIC_AUTH_SERVER_URL ?? 'https://auth.llama.fi'
export const AI_SERVER = 'https://ai.llama.fi'
export const CACHE_SERVER = 'https://fe-cache.llama.fi'
export const FEATURES_SERVER = process.env.NEXT_PUBLIC_FEATURES_SERVER_URL ?? 'https://features.llama.fi'
export const DATASETS_SERVER_URL =
	getDirectUrlEnv('DATASETS_SERVER_URL') ??
	(API_KEY ? `${PRO_API_BASE_URL}/${API_KEY}/datasets` : 'https://defillama-datasets.llama.fi')
export const SERVER_URL =
	getDirectUrlEnv('SERVER_URL') ?? (API_KEY ? `${PRO_API_BASE_URL}/${API_KEY}/api` : 'https://api.llama.fi')
export const V2_SERVER_URL = getDirectUrlEnv('V2_SERVER_URL') ?? `${SERVER_URL}/v2`

// Product/domain server roots
export const BRIDGES_SERVER_URL =
	getDirectUrlEnv('BRIDGES_SERVER_URL') ??
	(API_KEY ? `${PRO_API_BASE_URL}/${API_KEY}/bridges` : 'https://bridges.llama.fi')
export const COINS_SERVER_URL =
	getDirectUrlEnv('COINS_SERVER_URL') ?? (API_KEY ? `${PRO_API_BASE_URL}/${API_KEY}/coins` : 'https://coins.llama.fi')
export const EQUITIES_SERVER_URL =
	getDirectUrlEnv('EQUITIES_SERVER_URL') ??
	(API_KEY ? `${PRO_API_BASE_URL}/${API_KEY}/equities/v1` : 'https://api.llama.fi/equities/v1')
export const ETF_SERVER_URL =
	getDirectUrlEnv('ETF_SERVER_URL') ?? (API_KEY ? `${PRO_API_BASE_URL}/${API_KEY}/etfs` : 'https://etfs.llama.fi')
export const FDV_SERVER_URL =
	getDirectUrlEnv('FDV_SERVER_URL') ?? (API_KEY ? `${PRO_API_BASE_URL}/${API_KEY}/fdv` : 'https://fdv-server.llama.fi')
export const NFT_SERVER_URL = 'https://nft.llama.fi'
export const RWA_SERVER_URL =
	getDirectUrlEnv('RWA_SERVER_URL') ?? (API_KEY ? `${PRO_API_BASE_URL}/${API_KEY}/rwa` : 'https://api.llama.fi/rwa')
export const RWA_PERPS_SERVER_URL =
	getDirectUrlEnv('RWA_PERPS_SERVER_URL') ??
	(API_KEY ? `${PRO_API_BASE_URL}/${API_KEY}/rwa-perps` : 'https://api.llama.fi/rwa-perps')
export const STABLECOINS_SERVER_URL =
	getDirectUrlEnv('STABLECOINS_SERVER_URL') ??
	(API_KEY ? `${PRO_API_BASE_URL}/${API_KEY}/stablecoins` : 'https://stablecoins.llama.fi')
export const TRADFI_API =
	getDirectUrlEnv('TRADFI_API') ?? (API_KEY ? `${PRO_API_BASE_URL}/${API_KEY}/dat` : 'https://api.llama.fi/dat')
export const YIELDS_SERVER_URL =
	getDirectUrlEnv('YIELDS_SERVER_URL') ??
	(API_KEY ? `${PRO_API_BASE_URL}/${API_KEY}/yields` : 'https://yields.llama.fi')
export const LIQUIDATIONS_SERVER_URL_V2 =
	getDirectUrlEnv('LIQUIDATIONS_SERVER_URL_V2') ??
	(API_KEY ? `${PRO_API_BASE_URL}/${API_KEY}/liquidations` : 'https://api.llama.fi/liquidations')
export const RISK_SERVER_URL =
	getDirectUrlEnv('RISK_SERVER_URL') ?? (API_KEY ? `${PRO_API_BASE_URL}/${API_KEY}/risks` : 'https://risks.llama.fi')
export const MARKETS_SERVER_URL = getDirectUrlEnv('MARKETS_SERVER_URL')

// Core llama APIs
export const CONFIG_API = `${SERVER_URL}/config`
export const DIMENSIONS_OVERVIEW_API = `${SERVER_URL}/overview`
export const DIMENSIONS_SUMMARY_API = `${SERVER_URL}/summary`

// Coins
export const COINS_CHART_API = `${COINS_SERVER_URL}/chart`

// FDV/category metadata
export const CATEGORY_INFO_API = `${FDV_SERVER_URL}/info`

// Static assets
export const ICONS_CDN = 'https://icons.llamao.fi/icons'
export const TOTAL_TRACKED_BY_METRIC_API = 'https://api.llama.fi/config/smol/appMetadata-totalTrackedByMetric.json'
// The pro token-directory cache can serve truncated JSON; keep this endpoint on the public API for now.
export const TOKEN_DIRECTORY_API = 'https://api.llama.fi/config/smol/token.json'

// External services
export const POCKETBASE_URL = 'https://pb.llama.fi'
export const SEARCH_API_URL = 'https://search-core.defillama.com/multi-search'
