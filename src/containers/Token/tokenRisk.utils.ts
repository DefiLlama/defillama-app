import type { ProtocolLlamaswapMetadata } from '~/utils/metadata/types'
import type {
	TokenRiskLendingRisksResponse,
	TokenRiskLendingRoutesBucket,
	TokenRiskRoute,
	TokenRiskRouteMethodologies
} from './api.types'
import type {
	TokenRiskBorrowCapsRow,
	TokenRiskBorrowCapsSection,
	TokenRiskCandidate,
	TokenRiskCollateralRiskRow,
	TokenRiskCollateralRiskSection,
	TokenRiskSelectedChainRisk
} from './tokenRisk.types'

interface TokenRiskDisplayLookups {
	protocolDisplayNames: Map<string, string>
	chainDisplayNames: Map<string, string>
}

function resolveDisplayBorrowCapUsd(
	borrowCapUsd: number | null | undefined,
	debtCeilingUsd: number | null | undefined
) {
	return borrowCapUsd ?? debtCeilingUsd ?? null
}

export const TOKEN_RISK_LIMITATIONS_COMMON = [
	'Borrow caps are a strong risk signal, but they are not a full protocol risk rating.',
	'This v1 covers route-derived lending risk only and does not include multisigs, timelocks, audits, oracle incidents, listing discussions, curator reports, or protocol backstops.',
	'Chain-specific drilldown is exact only when the token resolves to a concrete chain:address.'
] as const

export const TOKEN_RISK_LIMITATION_DEBT_SIDE =
	'Debt-side totals repeat across many collateral routes, so this data cannot estimate collateral-specific lender loss.'

export const TOKEN_RISK_LIMITATION_COLLATERAL_SIDE =
	'Collateral-side available is route-level, but pooled markets do not expose collateral-specific borrowed totals without indexing individual borrow positions.'

function normalizeAddress(address: string | null | undefined): string {
	return (address ?? '').trim().toLowerCase()
}

function normalizeChain(chain: string | null | undefined): string {
	return (chain ?? '').trim().toLowerCase()
}

function normalizeSymbol(symbol: string | null | undefined): string {
	return (symbol ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase()
}

function buildRouteAssetKey(chain: string, address: string): string {
	return `${normalizeChain(chain)}:${normalizeAddress(address)}`
}

function uniqueSorted(values: Iterable<string>): string[] {
	return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

export function resolveTokenRiskCandidates(
	geckoId: string | null | undefined,
	protocolLlamaswapDataset: ProtocolLlamaswapMetadata | null | undefined
): TokenRiskCandidate[] {
	if (!geckoId || !protocolLlamaswapDataset?.[geckoId]?.length) return []

	const seen = new Set<string>()
	const candidates: TokenRiskCandidate[] = []

	for (const chainEntry of protocolLlamaswapDataset[geckoId] ?? []) {
		const chain = chainEntry.chain?.trim()
		const address = normalizeAddress(chainEntry.address)
		if (!chain || !address) continue

		const key = buildRouteAssetKey(chain, address)
		if (seen.has(key)) continue
		seen.add(key)

		candidates.push({
			key,
			chain,
			address,
			displayName: chainEntry.displayName || chain
		})
	}

	return candidates
}

export function inferTokenRiskCandidatesFromRoutes({
	tokenSymbol,
	routes,
	chainDisplayNames
}: {
	tokenSymbol: string | null | undefined
	routes: TokenRiskRoute[]
	chainDisplayNames?: Map<string, string>
}): TokenRiskCandidate[] {
	const normalizedTokenSymbol = normalizeSymbol(tokenSymbol)
	if (!normalizedTokenSymbol) return []

	const seen = new Set<string>()
	const candidates: TokenRiskCandidate[] = []

	for (const route of routes) {
		const matchedAssets: Array<{ address: string }> = []
		if (normalizeSymbol(route.collateral.symbol) === normalizedTokenSymbol) {
			matchedAssets.push({ address: route.collateral.address })
		}
		if (normalizeSymbol(route.debt.symbol) === normalizedTokenSymbol) {
			matchedAssets.push({ address: route.debt.address })
		}

		for (const asset of matchedAssets) {
			const address = normalizeAddress(asset.address)
			if (!address) continue

			const key = buildRouteAssetKey(route.chain, address)
			if (seen.has(key)) continue
			seen.add(key)

			candidates.push({
				key,
				chain: route.chain,
				address,
				displayName: chainDisplayNames?.get(route.chain) ?? route.chain
			})
		}
	}

	return candidates
}

export function filterTokenRiskCandidatesWithData(
	candidates: TokenRiskCandidate[],
	indexedRoutes: Map<string, TokenRiskLendingRoutesBucket>
): TokenRiskCandidate[] {
	return candidates.filter((candidate) => {
		const bucket = indexedRoutes.get(candidate.key)
		return Boolean(bucket && (bucket.asDebt.length > 0 || bucket.asCollateral.length > 0))
	})
}

export function indexBorrowRoutesByAssetKey(routes: TokenRiskRoute[]): Map<string, TokenRiskLendingRoutesBucket> {
	const indexedRoutes = new Map<string, TokenRiskLendingRoutesBucket>()

	for (const route of routes) {
		const collateralKey = buildRouteAssetKey(route.chain, route.collateral.address)
		const debtKey = buildRouteAssetKey(route.chain, route.debt.address)

		if (!indexedRoutes.has(collateralKey)) {
			indexedRoutes.set(collateralKey, {
				asDebt: [],
				asCollateral: []
			})
		}
		if (!indexedRoutes.has(debtKey)) {
			indexedRoutes.set(debtKey, {
				asDebt: [],
				asCollateral: []
			})
		}

		indexedRoutes.get(collateralKey)?.asCollateral.push(route)
		indexedRoutes.get(debtKey)?.asDebt.push(route)
	}

	return indexedRoutes
}

export function mergeIndexedBuckets(
	indexedRoutes: Map<string, TokenRiskLendingRoutesBucket>,
	candidateKeys: string[]
): TokenRiskLendingRoutesBucket {
	if (candidateKeys.length === 0) {
		return {
			asDebt: [],
			asCollateral: []
		}
	}

	return candidateKeys.reduce<TokenRiskLendingRoutesBucket>(
		(acc, candidateKey) => {
			const bucket = indexedRoutes.get(candidateKey)
			if (!bucket) return acc

			acc.asDebt.push(...bucket.asDebt)
			acc.asCollateral.push(...bucket.asCollateral)
			return acc
		},
		{ asDebt: [], asCollateral: [] }
	)
}

export function buildBorrowCapsSection(
	bucket: TokenRiskLendingRoutesBucket,
	methodologies: Pick<
		TokenRiskRouteMethodologies,
		'borrowCapUsd' | 'debtTotalBorrowedUsd' | 'debtUtilization' | 'availableToBorrowUsd'
	>,
	displayLookups?: TokenRiskDisplayLookups
): TokenRiskBorrowCapsSection {
	const groupedRows = new Map<
		string,
		{
			route: TokenRiskRoute
			collateralSymbols: Set<string>
			collateralKeys: Set<string>
		}
	>()

	for (const route of bucket.asDebt) {
		const groupKey = `${route.protocol}|${route.chain}|${route.market}|${normalizeAddress(route.debt.address)}`
		const existing = groupedRows.get(groupKey)

		if (existing) {
			existing.collateralSymbols.add(route.collateral.symbol)
			existing.collateralKeys.add(buildRouteAssetKey(route.chain, route.collateral.address))
			continue
		}

		groupedRows.set(groupKey, {
			route,
			collateralSymbols: new Set([route.collateral.symbol]),
			collateralKeys: new Set([buildRouteAssetKey(route.chain, route.collateral.address)])
		})
	}

	const rows: TokenRiskBorrowCapsRow[] = [...groupedRows.values()]
		.map(({ route, collateralSymbols, collateralKeys }) => {
			const borrowCapUsd = route.borrowCapUsd ?? null
			const debtCeilingUsd = route.debtCeilingUsd ?? null
			const displayBorrowCapUsd = resolveDisplayBorrowCapUsd(borrowCapUsd, debtCeilingUsd)
			const remainingCapUsd =
				borrowCapUsd == null
					? Math.max(route.debtTotalSupplyUsd - route.debtTotalBorrowedUsd, 0)
					: Math.max(borrowCapUsd - route.debtTotalBorrowedUsd, 0)

			return {
				protocol: route.protocol,
				protocolDisplayName: displayLookups?.protocolDisplayNames.get(route.protocol) ?? route.protocol,
				chain: route.chain,
				chainDisplayName: displayLookups?.chainDisplayNames.get(route.chain) ?? route.chain,
				market: route.market,
				debtSymbol: route.debt.symbol,
				borrowCapUsd,
				debtCeilingUsd,
				displayBorrowCapUsd,
				debtTotalBorrowedUsd: route.debtTotalBorrowedUsd,
				debtTotalSupplyUsd: route.debtTotalSupplyUsd,
				remainingCapUsd,
				availableToBorrowUsd: route.availableToBorrowUsd,
				debtUtilization: route.debtUtilization ?? null,
				eligibleCollateralCount: collateralKeys.size,
				eligibleCollateralSymbols: uniqueSorted(collateralSymbols)
			}
		})
		.sort((a, b) => {
			const aCap = a.displayBorrowCapUsd ?? Number.NEGATIVE_INFINITY
			const bCap = b.displayBorrowCapUsd ?? Number.NEGATIVE_INFINITY
			if (aCap !== bCap) return bCap - aCap
			if (a.debtTotalBorrowedUsd !== b.debtTotalBorrowedUsd) return b.debtTotalBorrowedUsd - a.debtTotalBorrowedUsd
			return a.market.localeCompare(b.market)
		})

	const cappedRows = rows.filter((row) => row.displayBorrowCapUsd != null && row.displayBorrowCapUsd > 0)
	const totalBorrowCapUsd = cappedRows.reduce((sum, row) => sum + (row.displayBorrowCapUsd ?? 0), 0)
	const totalBorrowedUsd = cappedRows.reduce((sum, row) => sum + row.debtTotalBorrowedUsd, 0)
	const remainingCapUsd = cappedRows.reduce((sum, row) => sum + (row.remainingCapUsd ?? 0), 0)

	return {
		summary: {
			totalBorrowCapUsd,
			totalBorrowedUsd,
			remainingCapUsd,
			capUtilization: totalBorrowCapUsd > 0 ? totalBorrowedUsd / totalBorrowCapUsd : null,
			protocolCount: new Set(rows.map((row) => row.protocol)).size,
			chainCount: new Set(rows.map((row) => row.chain)).size,
			marketCount: rows.length
		},
		rows,
		methodologies: {
			borrowCapUsd: methodologies.borrowCapUsd,
			debtTotalBorrowedUsd: methodologies.debtTotalBorrowedUsd,
			debtUtilization: methodologies.debtUtilization,
			availableToBorrowUsd: methodologies.availableToBorrowUsd
		}
	}
}

export function buildCollateralRiskSection(
	bucket: TokenRiskLendingRoutesBucket,
	methodologies: Pick<
		TokenRiskRouteMethodologies,
		| 'availableToBorrowUsd'
		| 'borrowCapUsd'
		| 'maxLtv'
		| 'liquidationThreshold'
		| 'liquidationPenalty'
		| 'isolationMode'
		| 'debtCeilingUsd'
	>,
	displayLookups?: TokenRiskDisplayLookups
): TokenRiskCollateralRiskSection {
	const rows: TokenRiskCollateralRiskRow[] = bucket.asCollateral
		.map((route) => ({
			protocol: route.protocol,
			protocolDisplayName: displayLookups?.protocolDisplayNames.get(route.protocol) ?? route.protocol,
			chain: route.chain,
			chainDisplayName: displayLookups?.chainDisplayNames.get(route.chain) ?? route.chain,
			market: route.market,
			debtSymbol: route.debt.symbol,
			borrowCapUsd: route.borrowCapUsd ?? null,
			displayBorrowCapUsd: resolveDisplayBorrowCapUsd(route.borrowCapUsd, route.debtCeilingUsd),
			debtTotalSupplyUsd: route.debtTotalSupplyUsd,
			maxLtv: route.maxLtv,
			liquidationThreshold: route.liquidationThreshold,
			liquidationPenalty: route.liquidationPenalty,
			liquidationBuffer: route.liquidationThreshold - route.maxLtv,
			borrowApy: route.borrowApy,
			isolationMode: Boolean(route.isolationMode),
			debtCeilingUsd: route.debtCeilingUsd ?? null,
			availableToBorrowUsd: route.availableToBorrowUsd
		}))
		.sort((a, b) => {
			if (a.availableToBorrowUsd !== b.availableToBorrowUsd) {
				return b.availableToBorrowUsd - a.availableToBorrowUsd
			}
			if (a.debtTotalSupplyUsd !== b.debtTotalSupplyUsd) {
				return b.debtTotalSupplyUsd - a.debtTotalSupplyUsd
			}
			return a.market.localeCompare(b.market)
		})

	const liquidationBuffers = rows.map((row) => row.liquidationBuffer).filter((value) => Number.isFinite(value))
	const totalAvailableToBorrowUsd = rows.reduce((sum, row) => sum + row.availableToBorrowUsd, 0)

	return {
		summary: {
			totalAvailableToBorrowUsd,
			routeCount: rows.length,
			isolatedRouteCount: rows.filter((row) => row.isolationMode).length,
			minLiquidationBuffer: liquidationBuffers.length > 0 ? Math.min(...liquidationBuffers) : null,
			maxLiquidationBuffer: liquidationBuffers.length > 0 ? Math.max(...liquidationBuffers) : null
		},
		rows,
		methodologies: {
			availableToBorrowUsd: methodologies.availableToBorrowUsd,
			borrowCapUsd: methodologies.borrowCapUsd,
			maxLtv: methodologies.maxLtv,
			liquidationThreshold: methodologies.liquidationThreshold,
			liquidationPenalty: methodologies.liquidationPenalty,
			isolationMode: methodologies.isolationMode,
			debtCeilingUsd: methodologies.debtCeilingUsd
		}
	}
}

export function buildSelectedChainRisk(
	candidateKey: string,
	selectedChainRisk: TokenRiskLendingRisksResponse | null,
	fallbackBucket: TokenRiskLendingRoutesBucket
): TokenRiskSelectedChainRisk {
	return {
		candidateKey,
		timestamp: selectedChainRisk?.timestamp ?? null,
		hourlyTimestamp: selectedChainRisk?.hourlyTimestamp ?? null,
		methodologies: selectedChainRisk?.methodologies ?? null,
		bucket: selectedChainRisk?.results?.[candidateKey] ?? fallbackBucket
	}
}
