import type { ITokenRightsData } from '~/containers/TokenRights/api.types'
import { extractYieldPoolTokens } from '~/containers/Yields/domain/poolFilters'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import type { ProtocolLlamaswapMetadata } from '~/utils/metadata/types'
import type { TokenDirectoryRecord } from '~/utils/tokenDirectory'
import { getTokenRiskBorrowCapacity } from './api'
import type { TokenRiskBorrowCapacityResponse } from './api.types'
import { DEFAULT_TABLE_PAGE_SIZE } from './tableUtils'
import type { TokenBorrowRoutesResponse } from './tokenBorrowRoutes.types'
import type { TokenOverviewData } from './tokenOverview'
import type { TokenRiskResponse } from './tokenRisk.types'
import {
	buildExposuresSection,
	CANONICAL_NATIVE_TOKEN_ADDRESS,
	filterTokenRiskCandidatesWithData,
	hasNativeWrappedTokenRiskAlias,
	indexBorrowCapacityByAssetKey,
	inferTokenRiskCandidatesFromBorrowCapacity,
	mergeIndexedBorrowCapacity,
	mergeTokenRiskCandidates,
	resolveTokenRiskCandidates,
	TOKEN_RISK_LIMITATIONS_COMMON,
	TOKEN_RISK_LIMITATION_MIN_BAD_DEBT_NULLS
} from './tokenRisk.utils'
import type { RiskTimelineResponse } from './tokenRiskTimeline.types'
import type {
	TokenBorrowRoutesHydration,
	TokenIncomeStatementData,
	TokenIssuer,
	TokenPageSection,
	TokenYieldsHydration
} from './types'

export function getCoinGeckoId(tokenNk: string | undefined): string | null {
	if (!tokenNk?.startsWith('coingecko:')) return null
	return tokenNk.slice('coingecko:'.length) || null
}

export function downgradeTokenPageDataError<T>(
	error: unknown,
	message: string,
	fallback: T,
	isIntegrityError: (error: unknown) => boolean
): T {
	if (isIntegrityError(error)) {
		throw error
	}
	console.error(message, error)
	return fallback
}

function getBorrowRouteChainList(rows: TokenBorrowRoutesResponse['borrowAsCollateral']): string[] {
	const chains = new Set<string>()
	for (const row of rows) {
		const chain = row.chains[0]
		if (typeof chain === 'string' && chain.length > 0) chains.add(chain)
	}
	return Array.from(chains).toSorted()
}

export function buildInitialYieldsSnapshot(yieldsRows: IYieldTableRow[]): TokenYieldsHydration {
	const chainList = new Set<string>()
	const tokensList = new Set<string>()
	for (const row of yieldsRows) {
		const chain = row.chains[0]
		if (chain) chainList.add(chain)
		for (const poolToken of extractYieldPoolTokens(row.pool)) {
			tokensList.add(poolToken.toUpperCase())
		}
	}

	return {
		rows: yieldsRows.slice(0, DEFAULT_TABLE_PAGE_SIZE),
		rowCount: yieldsRows.length,
		chainList: Array.from(chainList).toSorted(),
		tokensList: Array.from(tokensList).toSorted(),
		pageSize: DEFAULT_TABLE_PAGE_SIZE
	}
}

export function buildInitialBorrowRoutesSnapshot(
	tokenBorrowRoutesData: TokenBorrowRoutesResponse | null
): TokenBorrowRoutesHydration | null {
	if (!tokenBorrowRoutesData) return null

	return {
		data: {
			borrowAsCollateral: tokenBorrowRoutesData.borrowAsCollateral.slice(0, DEFAULT_TABLE_PAGE_SIZE),
			borrowAsDebt: tokenBorrowRoutesData.borrowAsDebt.slice(0, DEFAULT_TABLE_PAGE_SIZE)
		},
		counts: {
			borrowAsCollateral: tokenBorrowRoutesData.borrowAsCollateral.length,
			borrowAsDebt: tokenBorrowRoutesData.borrowAsDebt.length
		},
		chainLists: {
			borrowAsCollateral: getBorrowRouteChainList(tokenBorrowRoutesData.borrowAsCollateral),
			borrowAsDebt: getBorrowRouteChainList(tokenBorrowRoutesData.borrowAsDebt)
		},
		pageSize: DEFAULT_TABLE_PAGE_SIZE
	}
}

export function getTokenPageSections({
	record,
	geckoId,
	tokenRightsData,
	incomeStatement,
	tokenRiskData,
	tokenRiskTimelineData,
	hasLiquidations,
	hasMarkets,
	resolvedUnlocksSlug,
	yieldsSnapshot,
	borrowRoutesSnapshot,
	issuer,
	overview
}: {
	record: TokenDirectoryRecord
	geckoId: string | null
	tokenRightsData: ITokenRightsData | null
	incomeStatement: {
		data: TokenIncomeStatementData
		protocolName: string
		hasIncentives: boolean
	} | null
	tokenRiskData: TokenRiskResponse | null
	tokenRiskTimelineData: RiskTimelineResponse | null
	hasLiquidations: boolean
	hasMarkets: boolean
	resolvedUnlocksSlug: string | null
	yieldsSnapshot: ReturnType<typeof buildInitialYieldsSnapshot>
	borrowRoutesSnapshot: ReturnType<typeof buildInitialBorrowRoutesSnapshot>
	issuer: TokenIssuer | null
	overview: TokenOverviewData
}): TokenPageSection[] {
	const sections: TokenPageSection[] = [
		{
			id: 'token-overview',
			label: 'Overview',
			overview,
			geckoId,
			logo: record.logo ?? null,
			issuer
		}
	]

	if (incomeStatement) {
		sections.push({
			id: 'token-income-statement',
			label: 'Income Statement',
			protocolName: incomeStatement.protocolName,
			incomeStatement: incomeStatement.data,
			hasIncentives: incomeStatement.hasIncentives
		})
	}
	if (tokenRiskData) {
		sections.push({
			id: 'token-risks',
			label: 'Risks',
			tokenSymbol: record.symbol,
			riskData: tokenRiskData
		})
	}
	if (tokenRiskTimelineData) {
		sections.push({
			id: 'token-risk-timeline',
			label: 'Risk Timeline',
			tokenSymbol: record.symbol,
			timelineData: tokenRiskTimelineData
		})
	}
	if (hasMarkets) {
		sections.push({
			id: 'token-markets',
			label: 'Markets',
			tokenSymbol: record.symbol
		})
	}
	if (tokenRightsData) {
		sections.push({
			id: 'token-rights-and-value-accrual',
			label: 'Token Rights',
			name: record.name,
			symbol: record.symbol,
			tokenRightsData
		})
	}

	sections.push({
		id: 'token-usage',
		label: 'Token Usage',
		tokenSymbol: record.symbol
	})

	if (hasLiquidations) {
		sections.push({
			id: 'token-liquidations',
			label: 'Liquidations',
			tokenSymbol: record.symbol
		})
	}
	if (resolvedUnlocksSlug) {
		sections.push({
			id: 'token-unlocks',
			label: 'Unlocks',
			resolvedUnlocksSlug
		})
	}
	if (record.is_yields && yieldsSnapshot.rowCount > 0) {
		sections.push({
			id: 'token-yields',
			label: 'Yields',
			tokenSymbol: record.symbol,
			hydration: yieldsSnapshot
		})
	}
	if (
		borrowRoutesSnapshot &&
		(borrowRoutesSnapshot.counts.borrowAsCollateral > 0 || borrowRoutesSnapshot.counts.borrowAsDebt > 0)
	) {
		sections.push({
			id: 'token-borrow',
			label: 'Borrow',
			tokenSymbol: record.symbol,
			hydration: borrowRoutesSnapshot
		})
	}

	return sections
}

const BORROW_CAPACITY_CACHE_TTL_MS = 5 * 60 * 1000

type IndexedBorrowCapacityCache = {
	data: TokenRiskBorrowCapacityResponse
	indexedTokens: ReturnType<typeof indexBorrowCapacityByAssetKey>
	fetchedAt?: number
}

type TokenRiskDisplayLookups = {
	protocolDisplayNames: Map<string, string>
	chainDisplayNames: Map<string, string>
}

type TokenRiskQueryInput = {
	geckoId: string
	tokenSymbol: string
	protocolLlamaswapDataset: ProtocolLlamaswapMetadata
	displayLookups: TokenRiskDisplayLookups
	borrowCapacitySnapshot?: IndexedBorrowCapacityCache
}

let borrowCapacityCache: IndexedBorrowCapacityCache | null = null
let borrowCapacityInFlight: Promise<IndexedBorrowCapacityCache> | null = null

export function resetTokenRiskBorrowRoutesCache() {
	borrowCapacityCache = null
	borrowCapacityInFlight = null
}

async function getIndexedBorrowCapacityCache(): Promise<IndexedBorrowCapacityCache> {
	const now = Date.now()
	if (
		borrowCapacityCache &&
		borrowCapacityCache.fetchedAt &&
		now - borrowCapacityCache.fetchedAt < BORROW_CAPACITY_CACHE_TTL_MS
	) {
		return borrowCapacityCache
	}

	if (borrowCapacityInFlight) {
		return borrowCapacityInFlight
	}

	borrowCapacityInFlight = (async () => {
		const data = await getTokenRiskBorrowCapacity()
		return {
			data,
			indexedTokens: indexBorrowCapacityByAssetKey(data.tokens),
			fetchedAt: Date.now()
		}
	})()
		.then((cacheValue) => {
			borrowCapacityCache = cacheValue
			return cacheValue
		})
		.finally(() => {
			borrowCapacityInFlight = null
		})

	return borrowCapacityInFlight
}

export async function getTokenRiskData({
	geckoId,
	tokenSymbol,
	protocolLlamaswapDataset,
	displayLookups,
	borrowCapacitySnapshot
}: TokenRiskQueryInput): Promise<TokenRiskResponse | null> {
	const resolvedBorrowCapacitySnapshot = borrowCapacitySnapshot ?? (await getIndexedBorrowCapacityCache())
	const metadataCandidates = resolveTokenRiskCandidates(geckoId, tokenSymbol, protocolLlamaswapDataset)
	const inferredCandidates = inferTokenRiskCandidatesFromBorrowCapacity({
		tokenSymbol,
		tokens: resolvedBorrowCapacitySnapshot.data.tokens,
		chainDisplayNames: displayLookups.chainDisplayNames
	})
	const shouldSupplementMetadataCandidates =
		metadataCandidates.some((candidate) => candidate.address === CANONICAL_NATIVE_TOKEN_ADDRESS) ||
		hasNativeWrappedTokenRiskAlias(tokenSymbol)
	const candidates =
		metadataCandidates.length > 0 && shouldSupplementMetadataCandidates
			? mergeTokenRiskCandidates(metadataCandidates, inferredCandidates)
			: metadataCandidates.length > 0
				? metadataCandidates
				: inferredCandidates
	if (candidates.length === 0) return null

	const scopeCandidates = filterTokenRiskCandidatesWithData(candidates, resolvedBorrowCapacitySnapshot.indexedTokens)
	if (scopeCandidates.length === 0) return null

	const activeTokens = mergeIndexedBorrowCapacity(
		resolvedBorrowCapacitySnapshot.indexedTokens,
		scopeCandidates.map((candidate) => candidate.key)
	)

	const exposures = buildExposuresSection(
		activeTokens,
		resolvedBorrowCapacitySnapshot.data.methodologies,
		displayLookups
	)
	if (exposures.rows.length === 0) return null

	return {
		candidates,
		scopeCandidates,
		selectedCandidateKey: null,
		exposures,
		limitations: [
			...TOKEN_RISK_LIMITATIONS_COMMON,
			...(exposures.summary.minBadDebtUnknownCount > 0 ? [TOKEN_RISK_LIMITATION_MIN_BAD_DEBT_NULLS] : [])
		]
	}
}
