export const DIRECT_URL_ENV_NAMES = [
	'BRIDGES_SERVER_URL',
	'COINS_SERVER_URL',
	'DATASETS_SERVER_URL',
	'EQUITIES_SERVER_URL',
	'ETF_SERVER_URL',
	'FDV_SERVER_URL',
	'LIQUIDATIONS_SERVER_URL_V2',
	'MARKETS_SERVER_URL',
	'RISK_SERVER_URL',
	'RWA_PERPS_SERVER_URL',
	'RWA_SERVER_URL',
	'SERVER_URL',
	'STABLECOINS_SERVER_URL',
	'TRADFI_API',
	'V2_SERVER_URL',
	'YIELDS_SERVER_URL'
] as const

export type DirectUrlEnvName = (typeof DIRECT_URL_ENV_NAMES)[number]

export const DIRECT_AUTH_SECRET_ENV_NAMES = [
	'API2_SECRET_KEY',
	'EQUITIES_SECRET_KEY',
	'LIQUIDATIONS_SECRET_KEY'
] as const

const DIRECT_AUTH_CONFIGS = [
	{ envName: 'SERVER_URL', queryParamName: 'x-llama-pro-key', secretKind: 'core' },
	{ envName: 'V2_SERVER_URL', queryParamName: 'x-llama-pro-key', secretKind: 'core' },
	{ envName: 'EQUITIES_SERVER_URL', queryParamName: 'x-llama-equity-secret', secretKind: 'equities' },
	{ envName: 'LIQUIDATIONS_SERVER_URL_V2', queryParamName: 'x-llama-secret', secretKind: 'liquidations' }
] as const satisfies ReadonlyArray<{
	envName: DirectUrlEnvName
	queryParamName: string
	secretKind: DirectAuthSecretKind
}>

type DirectAuthSecretKind = 'core' | 'equities' | 'liquidations'

function normalizeDirectUrlEnv(value: string | undefined): string | undefined {
	value = value?.trim()
	if (!value) return undefined
	return value.replace(/\/+$/, '')
}

function normalizeDirectAuthSecret(value: string | undefined): string | undefined {
	value = value?.trim()
	return value || undefined
}

function getCoreDirectAuthSecret(): string | undefined {
	return normalizeDirectAuthSecret(process.env.API2_SECRET_KEY)
}

function getDirectAuthSecret(kind: DirectAuthSecretKind): string | undefined {
	switch (kind) {
		case 'core':
			return getCoreDirectAuthSecret()
		case 'equities':
			return normalizeDirectAuthSecret(process.env.EQUITIES_SECRET_KEY) ?? getCoreDirectAuthSecret()
		case 'liquidations':
			return normalizeDirectAuthSecret(process.env.LIQUIDATIONS_SECRET_KEY)
	}
}

export function getDirectUrlEnv(name: DirectUrlEnvName): string | undefined {
	switch (name) {
		case 'BRIDGES_SERVER_URL':
			return normalizeDirectUrlEnv(process.env.BRIDGES_SERVER_URL)
		case 'COINS_SERVER_URL':
			return normalizeDirectUrlEnv(process.env.COINS_SERVER_URL)
		case 'DATASETS_SERVER_URL':
			return normalizeDirectUrlEnv(process.env.DATASETS_SERVER_URL)
		case 'EQUITIES_SERVER_URL':
			return normalizeDirectUrlEnv(process.env.EQUITIES_SERVER_URL)
		case 'ETF_SERVER_URL':
			return normalizeDirectUrlEnv(process.env.ETF_SERVER_URL)
		case 'FDV_SERVER_URL':
			return normalizeDirectUrlEnv(process.env.FDV_SERVER_URL)
		case 'LIQUIDATIONS_SERVER_URL_V2':
			return normalizeDirectUrlEnv(process.env.LIQUIDATIONS_SERVER_URL_V2)
		case 'MARKETS_SERVER_URL':
			return normalizeDirectUrlEnv(process.env.MARKETS_SERVER_URL)
		case 'RISK_SERVER_URL':
			return normalizeDirectUrlEnv(process.env.RISK_SERVER_URL)
		case 'RWA_PERPS_SERVER_URL':
			return normalizeDirectUrlEnv(process.env.RWA_PERPS_SERVER_URL)
		case 'RWA_SERVER_URL':
			return normalizeDirectUrlEnv(process.env.RWA_SERVER_URL)
		case 'SERVER_URL':
			return normalizeDirectUrlEnv(process.env.SERVER_URL)
		case 'STABLECOINS_SERVER_URL':
			return normalizeDirectUrlEnv(process.env.STABLECOINS_SERVER_URL)
		case 'TRADFI_API':
			return normalizeDirectUrlEnv(process.env.TRADFI_API)
		case 'V2_SERVER_URL':
			return normalizeDirectUrlEnv(process.env.V2_SERVER_URL)
		case 'YIELDS_SERVER_URL':
			return normalizeDirectUrlEnv(process.env.YIELDS_SERVER_URL)
	}

	const exhaustive: never = name
	return exhaustive
}

function isRequestInput(url: RequestInfo | URL): url is Request {
	return typeof Request !== 'undefined' && url instanceof Request
}

function urlStringFromRequestInfo(url: RequestInfo | URL): string | null {
	if (typeof url === 'string') return url
	if (url instanceof URL) return url.toString()
	if (isRequestInput(url)) return url.url
	return null
}

function getBasePathMatchLength(url: URL, baseUrl: string): number | null {
	let base: URL
	try {
		base = new URL(baseUrl)
	} catch {
		return null
	}

	if (url.origin !== base.origin) return null

	const basePath = base.pathname.replace(/\/+$/, '') || '/'
	const urlPath = url.pathname.replace(/\/+$/, '') || '/'
	if (basePath === '/') return basePath.length
	if (urlPath === basePath || urlPath.startsWith(`${basePath}/`)) return basePath.length
	return null
}

function getDirectAuth(url: URL): { queryParamName: string; secret: string } | null {
	let bestMatch: { queryParamName: string; matchLength: number; secret: string } | null = null

	for (const config of DIRECT_AUTH_CONFIGS) {
		const baseUrl = getDirectUrlEnv(config.envName)
		if (!baseUrl) continue
		const secret = getDirectAuthSecret(config.secretKind)
		if (!secret) continue

		const matchLength = getBasePathMatchLength(url, baseUrl)
		if (matchLength === null) continue
		if (!bestMatch || matchLength > bestMatch.matchLength) {
			bestMatch = { queryParamName: config.queryParamName, matchLength, secret }
		}
	}

	return bestMatch ? { queryParamName: bestMatch.queryParamName, secret: bestMatch.secret } : null
}

export function withDirectApiAuth(url: RequestInfo | URL): RequestInfo | URL {
	const urlString = urlStringFromRequestInfo(url)
	if (!urlString) return url

	let parsed: URL
	try {
		parsed = new URL(urlString)
	} catch {
		return url
	}

	const auth = getDirectAuth(parsed)
	if (!auth) return url

	parsed.searchParams.set(auth.queryParamName, auth.secret)

	if (typeof url === 'string') return parsed.toString()
	if (url instanceof URL) return parsed
	if (isRequestInput(url)) return new Request(parsed.toString(), url)
	return url
}
