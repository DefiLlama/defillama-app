import type { ProtocolLlamaswapMetadata } from '~/utils/metadata/types'
import type { TokenRiskExposure, TokenRiskExposureMethodologies } from './api.types'
import type {
	TokenRiskCandidate,
	TokenRiskCoverageStatus,
	TokenRiskExposuresSection,
	TokenRiskExposureRow
} from './tokenRisk.types'

interface TokenRiskDisplayLookups {
	protocolDisplayNames: Map<string, string>
	chainDisplayNames: Map<string, string>
}

export const TOKEN_RISK_LIMITATIONS_COMMON = [
	'These metrics describe lending exposure only and are not a full protocol risk rating.',
	'This view does not include multisigs, timelocks, audits, oracle incidents, listing discussions, curator reports, or protocol backstops.',
	'Chain-specific drilldown is exact only when the token resolves to a concrete chain:address.'
] as const

export const TOKEN_RISK_LIMITATION_BORROWED_DEBT_NULLS =
	'When any contributing market cannot attribute borrowed debt to a specific collateral asset, borrowed-debt totals are returned as unavailable instead of being under-counted.'

export const TOKEN_RISK_LIMITATION_MIN_BAD_DEBT_NULLS =
	'Minimum bad-debt totals at a zero asset price are lower bounds when some contributing markets return null for this metric; null rows are excluded instead of being treated as zero.'

function normalizeAddress(address: string | null | undefined): string {
	return (address ?? '').trim().toLowerCase()
}

function normalizeChain(chain: string | null | undefined): string {
	return (chain ?? '').trim().toLowerCase()
}

function normalizeSymbol(symbol: string | null | undefined): string {
	return (symbol ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase()
}

function buildAssetKey(chain: string, address: string): string {
	return `${normalizeChain(chain)}:${normalizeAddress(address)}`
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

		const key = buildAssetKey(chain, address)
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

export function inferTokenRiskCandidatesFromExposures({
	tokenSymbol,
	exposures,
	chainDisplayNames
}: {
	tokenSymbol: string | null | undefined
	exposures: TokenRiskExposure[]
	chainDisplayNames?: Map<string, string>
}): TokenRiskCandidate[] {
	const normalizedTokenSymbol = normalizeSymbol(tokenSymbol)
	if (!normalizedTokenSymbol) return []

	const seen = new Set<string>()
	const candidates: TokenRiskCandidate[] = []

	for (const exposure of exposures) {
		if (normalizeSymbol(exposure.asset.symbol) !== normalizedTokenSymbol) continue

		const address = normalizeAddress(exposure.asset.address)
		if (!address) continue

		const key = buildAssetKey(exposure.chain, address)
		if (seen.has(key)) continue
		seen.add(key)

		candidates.push({
			key,
			chain: exposure.chain,
			address,
			displayName: chainDisplayNames?.get(exposure.chain) ?? exposure.chain
		})
	}

	return candidates
}

export function indexExposuresByAssetKey(exposures: TokenRiskExposure[]): Map<string, TokenRiskExposure[]> {
	const indexedExposures = new Map<string, TokenRiskExposure[]>()

	for (const exposure of exposures) {
		const key = buildAssetKey(exposure.chain, exposure.asset.address)
		const existing = indexedExposures.get(key)
		if (existing) {
			existing.push(exposure)
			continue
		}

		indexedExposures.set(key, [exposure])
	}

	return indexedExposures
}

export function filterTokenRiskCandidatesWithData(
	candidates: TokenRiskCandidate[],
	indexedExposures: Map<string, TokenRiskExposure[]>
): TokenRiskCandidate[] {
	return candidates.filter((candidate) => {
		const exposures = indexedExposures.get(candidate.key)
		return Boolean(exposures && exposures.length > 0)
	})
}

export function mergeIndexedExposures(
	indexedExposures: Map<string, TokenRiskExposure[]>,
	candidateKeys: string[]
): TokenRiskExposure[] {
	if (candidateKeys.length === 0) return []

	const merged: TokenRiskExposure[] = []

	for (const candidateKey of candidateKeys) {
		const exposures = indexedExposures.get(candidateKey)
		if (!exposures) continue
		merged.push(...exposures)
	}

	return merged
}

export function buildExposuresSection(
	exposures: TokenRiskExposure[],
	methodologies: Pick<
		TokenRiskExposureMethodologies,
		'asset' | 'collateralMaxBorrowUsd' | 'collateralBorrowedDebtUsd' | 'minBadDebtAtPriceZeroUsd'
	>,
	displayLookups?: TokenRiskDisplayLookups
): TokenRiskExposuresSection {
	type GroupedExposureRow = TokenRiskExposureRow & {
		minBadDebtKnownInputs: number
		minBadDebtUnknownInputs: number
	}

	const groupedRows = new Map<string, GroupedExposureRow>()

	for (const exposure of exposures) {
		const groupKey = `${exposure.protocol}|${exposure.chain}|${normalizeAddress(exposure.asset.address)}`
		const existing = groupedRows.get(groupKey)

		if (existing) {
			existing.collateralMaxBorrowUsd += exposure.collateralMaxBorrowUsd
			existing.collateralBorrowedDebtUsd =
				existing.collateralBorrowedDebtUsd == null || exposure.collateralBorrowedDebtUsd == null
					? null
					: existing.collateralBorrowedDebtUsd + exposure.collateralBorrowedDebtUsd
			if (exposure.minBadDebtAtPriceZeroUsd == null) {
				existing.minBadDebtUnknownInputs += 1
			} else {
				existing.minBadDebtAtPriceZeroUsd = (existing.minBadDebtAtPriceZeroUsd ?? 0) + exposure.minBadDebtAtPriceZeroUsd
				existing.minBadDebtKnownInputs += 1
			}
			continue
		}

		groupedRows.set(groupKey, {
			protocol: exposure.protocol,
			protocolDisplayName: displayLookups?.protocolDisplayNames.get(exposure.protocol) ?? exposure.protocol,
			chain: exposure.chain,
			chainDisplayName: displayLookups?.chainDisplayNames.get(exposure.chain) ?? exposure.chain,
			assetSymbol: exposure.asset.symbol,
			assetAddress: normalizeAddress(exposure.asset.address),
			collateralMaxBorrowUsd: exposure.collateralMaxBorrowUsd,
			collateralBorrowedDebtUsd: exposure.collateralBorrowedDebtUsd,
			minBadDebtAtPriceZeroUsd: exposure.minBadDebtAtPriceZeroUsd,
			minBadDebtAtPriceZeroCoverage: exposure.minBadDebtAtPriceZeroUsd == null ? 'unavailable' : 'known',
			minBadDebtKnownInputs: exposure.minBadDebtAtPriceZeroUsd == null ? 0 : 1,
			minBadDebtUnknownInputs: exposure.minBadDebtAtPriceZeroUsd == null ? 1 : 0
		})
	}

	const rows = [...groupedRows.values()]
		.map<TokenRiskExposureRow>(({ minBadDebtKnownInputs, minBadDebtUnknownInputs, ...row }) => {
			let minBadDebtAtPriceZeroCoverage: TokenRiskCoverageStatus = 'unavailable'

			if (minBadDebtKnownInputs > 0 && minBadDebtUnknownInputs === 0) {
				minBadDebtAtPriceZeroCoverage = 'known'
			} else if (minBadDebtKnownInputs > 0) {
				minBadDebtAtPriceZeroCoverage = 'partial'
			}

			return {
				...row,
				minBadDebtAtPriceZeroCoverage
			}
		})
		.sort((a, b) => {
			if (a.collateralMaxBorrowUsd !== b.collateralMaxBorrowUsd) {
				return b.collateralMaxBorrowUsd - a.collateralMaxBorrowUsd
			}

			const aBorrowed = a.collateralBorrowedDebtUsd ?? Number.NEGATIVE_INFINITY
			const bBorrowed = b.collateralBorrowedDebtUsd ?? Number.NEGATIVE_INFINITY
			if (aBorrowed !== bBorrowed) return bBorrowed - aBorrowed

			return a.protocolDisplayName.localeCompare(b.protocolDisplayName)
		})

	const totalCollateralMaxBorrowUsd = rows.reduce((sum, row) => sum + row.collateralMaxBorrowUsd, 0)
	const borrowedDebtUnknownCount = rows.filter((row) => row.collateralBorrowedDebtUsd == null).length
	const totalCollateralBorrowedDebtUsd =
		borrowedDebtUnknownCount > 0 ? null : rows.reduce((sum, row) => sum + (row.collateralBorrowedDebtUsd ?? 0), 0)
	const minBadDebtRowsWithKnownValues = rows.filter((row) => row.minBadDebtAtPriceZeroUsd != null)
	const totalMinBadDebtAtPriceZeroUsd =
		minBadDebtRowsWithKnownValues.length > 0
			? minBadDebtRowsWithKnownValues.reduce((sum, row) => sum + (row.minBadDebtAtPriceZeroUsd ?? 0), 0)
			: null
	const minBadDebtKnownCount = rows.filter((row) => row.minBadDebtAtPriceZeroCoverage === 'known').length
	const minBadDebtUnknownCount = rows.length - minBadDebtKnownCount

	return {
		summary: {
			totalCollateralMaxBorrowUsd,
			totalCollateralBorrowedDebtUsd,
			totalMinBadDebtAtPriceZeroUsd,
			exposureCount: rows.length,
			protocolCount: new Set(rows.map((row) => row.protocol)).size,
			chainCount: new Set(rows.map((row) => row.chain)).size,
			borrowedDebtKnownCount: rows.length - borrowedDebtUnknownCount,
			borrowedDebtUnknownCount,
			minBadDebtKnownCount,
			minBadDebtUnknownCount
		},
		rows,
		methodologies: {
			asset: methodologies.asset,
			collateralMaxBorrowUsd: methodologies.collateralMaxBorrowUsd,
			collateralBorrowedDebtUsd: methodologies.collateralBorrowedDebtUsd,
			minBadDebtAtPriceZeroUsd: methodologies.minBadDebtAtPriceZeroUsd
		}
	}
}
