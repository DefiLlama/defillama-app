import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import type { IFetchedRWAProject, IRWAAssetData } from './api.types'

type RWAYieldProtocolConfig = {
	name?: string
	category?: string
}

export type RWAYieldPoolSourceRow = Partial<Omit<IYieldTableRow, 'pool' | 'project' | 'chains' | 'tvl' | 'url'>> & {
	pool: string
	project: string
	symbol?: string | null
	chain?: string | null
	apy?: number | null
	apyBase?: number | null
	exposure?: string | null
	ilRisk?: string | null
	underlyingTokens?: string[] | null
	tvl?: number | null
	tvlUsd?: number | null
}

type RWAYieldPoolMatchedRow = RWAYieldPoolSourceRow & {
	_matchStrategy: 1 | 2 | 3
}

export type RWAYieldPoolData = {
	allPools: RWAYieldPoolSourceRow[]
	configProtocols: Record<string, RWAYieldProtocolConfig>
	poolUrls: Record<string, string>
}

type RWAYieldPoolApiResponse = {
	data?: RWAYieldPoolSourceRow[]
}

type RWAYieldConfigApiResponse = {
	protocols?: Record<string, RWAYieldProtocolConfig>
}

export type RWAYieldMatchResult = Pick<
	IRWAAssetData,
	'yieldPools' | 'yieldPoolsTotal' | 'nativeYieldPoolId' | 'nativeYieldCurrent'
>

export const emptyRwaYieldMatchResult = (): RWAYieldMatchResult => ({
	yieldPools: null,
	yieldPoolsTotal: null,
	nativeYieldPoolId: null,
	nativeYieldCurrent: null
})

export async function fetchRwaYieldPoolData(): Promise<RWAYieldPoolData> {
	const [{ fetchJson }, { YIELD_POOLS_API, YIELD_CONFIG_API, YIELD_URL_API }] = await Promise.all([
		import('~/utils/async'),
		import('~/constants')
	])

	const [poolsRes, configRes, urlsRes] = await Promise.all([
		fetchJson<RWAYieldPoolApiResponse>(YIELD_POOLS_API),
		fetchJson<RWAYieldConfigApiResponse>(YIELD_CONFIG_API),
		fetchJson<Record<string, string>>(YIELD_URL_API)
	])

	return {
		allPools: poolsRes?.data ?? [],
		configProtocols: configRes?.protocols ?? {},
		poolUrls: urlsRes ?? {}
	}
}

export async function matchRwaYieldPools(
	asset: IFetchedRWAProject,
	yieldPoolData: RWAYieldPoolData | null
): Promise<RWAYieldMatchResult> {
	const hasContracts = !!asset.contracts && Object.keys(asset.contracts).length > 0
	const ticker = asset.ticker?.toUpperCase()
	const hasTicker = !!ticker && ticker.length >= 3
	const hasProjectAndTicker = !!asset.projectId && hasTicker

	if ((!hasContracts && !hasTicker) || yieldPoolData == null) {
		return emptyRwaYieldMatchResult()
	}

	const addressesByChain = new Map<string, Set<string>>()
	if (hasContracts) {
		for (const [chain, addresses] of Object.entries(asset.contracts ?? {})) {
			addressesByChain.set(chain.toLowerCase(), new Set(addresses.map((address) => address.toLowerCase())))
		}
	}

	const projectSlugs = await resolveRwaProjectSlugs(asset)
	const matchedPoolIds = new Set<string>()
	const matchedPools: RWAYieldPoolMatchedRow[] = []

	for (const pool of yieldPoolData.allPools) {
		if (pool.apy === 0) continue
		if (matchedPoolIds.has(pool.pool)) continue
		if (pool.exposure !== 'single' || pool.ilRisk !== 'no') continue

		if (hasContracts && pool.chain) {
			const chainAddrs = addressesByChain.get(pool.chain.toLowerCase())
			const underlyingTokens = pool.underlyingTokens ?? []
			if (chainAddrs && underlyingTokens.some((token) => chainAddrs.has(token.toLowerCase()))) {
				matchedPoolIds.add(pool.pool)
				matchedPools.push({ ...pool, _matchStrategy: 1 })
				continue
			}
		}

		if (hasProjectAndTicker && projectSlugs.size > 0 && pool.symbol && projectSlugs.has(pool.project)) {
			const poolTokens = tokenizeYieldPoolSymbol(pool.symbol)
			if (poolTokens.some((token) => token === ticker || token.includes(ticker) || ticker.includes(token))) {
				matchedPoolIds.add(pool.pool)
				matchedPools.push({ ...pool, _matchStrategy: 2 })
				continue
			}
		}

		if (hasTicker && pool.symbol && tokenizeYieldPoolSymbol(pool.symbol).some((token) => token === ticker)) {
			matchedPoolIds.add(pool.pool)
			matchedPools.push({ ...pool, _matchStrategy: 3 })
		}
	}

	if (matchedPools.length === 0) {
		return emptyRwaYieldMatchResult()
	}

	const issuerProjectSlugs = resolveIssuerProjectSlugs(asset, projectSlugs, matchedPools)
	const issuerPools = matchedPools.filter((pool) => issuerProjectSlugs.has(pool.project))
	const defiPools = matchedPools.filter((pool) => !issuerProjectSlugs.has(pool.project))

	issuerPools.sort(sortYieldPoolsByTvlDesc)
	const primaryIssuerPool = issuerPools[0] ?? null
	defiPools.sort(sortYieldPoolsByTvlDesc)

	const cappedPools = defiPools.slice(0, 10)
	if (cappedPools.length === 0) {
		return {
			yieldPools: null,
			yieldPoolsTotal: null,
			nativeYieldPoolId: primaryIssuerPool?.pool ?? null,
			nativeYieldCurrent: primaryIssuerPool?.apyBase ?? null
		}
	}

	return {
		yieldPools: cappedPools.map((pool) => toYieldTableRow(pool, yieldPoolData)),
		yieldPoolsTotal: defiPools.length,
		nativeYieldPoolId: primaryIssuerPool?.pool ?? null,
		nativeYieldCurrent: primaryIssuerPool?.apyBase ?? null
	}
}

async function resolveRwaProjectSlugs(asset: IFetchedRWAProject): Promise<Set<string>> {
	const projectSlugs = new Set<string>()
	if (!asset.projectId || !asset.ticker || asset.ticker.length < 3) return projectSlugs

	const ids = Array.isArray(asset.projectId) ? asset.projectId : [asset.projectId]
	const metadataCache = await import('~/utils/metadata').then((module) => module.default)
	for (const id of ids) {
		const meta = metadataCache.protocolMetadata[String(id)] as { name?: string } | undefined
		if (meta?.name) projectSlugs.add(meta.name)
	}

	return projectSlugs
}

function resolveIssuerProjectSlugs(
	asset: IFetchedRWAProject,
	projectSlugs: Set<string>,
	matchedPools: RWAYieldPoolMatchedRow[]
): Set<string> {
	const issuerProjectSlugs = new Set(projectSlugs)
	if (issuerProjectSlugs.size > 0 || !asset.issuer) return issuerProjectSlugs

	const issuerLower = asset.issuer.trim().toLowerCase()
	const candidates: string[] = []
	const firstWord = issuerLower.split(/\s+/)[0]
	if (firstWord.length >= 3) candidates.push(firstWord)

	const parenMatch = issuerLower.match(/\(([^)]+)\)/)
	if (parenMatch) {
		const normalized = parenMatch[1].replace(/[^a-z0-9]/g, '')
		if (normalized.length >= 3) candidates.push(normalized)
	}

	for (const pool of matchedPools) {
		const slugNormalized = pool.project.toLowerCase().replace(/[^a-z0-9]/g, '')
		for (const candidate of candidates) {
			if (slugNormalized.startsWith(candidate) || candidate.startsWith(slugNormalized)) {
				issuerProjectSlugs.add(pool.project)
				break
			}
		}
	}

	return issuerProjectSlugs
}

function tokenizeYieldPoolSymbol(symbol: string): string[] {
	return symbol
		.toUpperCase()
		.split(/[-+/]/)
		.map((token) => token.trim())
		.filter(Boolean)
}

function sortYieldPoolsByTvlDesc(a: RWAYieldPoolSourceRow, b: RWAYieldPoolSourceRow): number {
	return (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0)
}

function toYieldTableRow(pool: RWAYieldPoolMatchedRow, yieldPoolData: RWAYieldPoolData): IYieldTableRow {
	return {
		...pool,
		pool: pool.symbol ?? pool.pool,
		projectslug: pool.project,
		project: yieldPoolData.configProtocols[pool.project]?.name ?? pool.project,
		chains: pool.chain ? [pool.chain] : [],
		tvl: pool.tvlUsd ?? pool.tvl ?? null,
		apy: pool.apy ?? null,
		apyBase: pool.apyBase ?? null,
		apyReward: pool.apyReward ?? null,
		rewardTokensSymbols: pool.rewardTokensSymbols ?? [],
		rewards: pool.rewards ?? [],
		change1d: pool.change1d ?? null,
		change7d: pool.change7d ?? null,
		confidence: pool.confidence ?? null,
		url: yieldPoolData.poolUrls[pool.pool] ?? '',
		category: pool.category ?? null,
		configID: pool.pool
	}
}
