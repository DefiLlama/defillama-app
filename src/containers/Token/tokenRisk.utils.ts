import type { ProtocolLlamaswapMetadata } from '~/utils/metadata/types'
import type { TokenRiskBorrowCapacityMethodologies, TokenRiskBorrowCapacityTokenEntry } from './api.types'
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

export const TOKEN_RISK_LIMITATION_MIN_BAD_DEBT_NULLS =
	'Bad debt at $0 is a lower bound when some contributing markets return null for zero-price bad debt; null rows are excluded instead of being treated as zero.'

function normalizeAddress(address: string | null | undefined): string {
	return (address ?? '').trim().toLowerCase()
}

function normalizeChain(chain: string | null | undefined): string {
	return (chain ?? '').trim().toLowerCase()
}

function normalizeSymbol(symbol: string | null | undefined): string {
	return (symbol ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase()
}

const NATIVE_TOKEN_ADDRESSES = new Set([
	'0x0000000000000000000000000000000000000000',
	'0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
])
export const CANONICAL_NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000'

const NATIVE_WRAPPED_SYMBOL_GROUPS = [
	['ETH', 'WETH'],
	['BNB', 'WBNB'],
	['AVAX', 'WAVAX'],
	['POL', 'WPOL'],
	['XDAI', 'WXDAI'],
	['XPL', 'WXPL']
] as const

const TOKEN_RISK_SYMBOL_ALIASES = new Map<string, Set<string>>()

for (const group of NATIVE_WRAPPED_SYMBOL_GROUPS) {
	const aliases = new Set(group.map((symbol) => normalizeSymbol(symbol)))

	for (const symbol of aliases) {
		TOKEN_RISK_SYMBOL_ALIASES.set(symbol, aliases)
	}
}

function normalizeRiskAssetAddress(address: string | null | undefined): string {
	const normalizedAddress = normalizeAddress(address)
	return NATIVE_TOKEN_ADDRESSES.has(normalizedAddress) ? CANONICAL_NATIVE_TOKEN_ADDRESS : normalizedAddress
}

function getTokenRiskSymbolAliases(symbol: string | null | undefined): Set<string> {
	const normalizedSymbol = normalizeSymbol(symbol)
	return TOKEN_RISK_SYMBOL_ALIASES.get(normalizedSymbol) ?? new Set(normalizedSymbol ? [normalizedSymbol] : [])
}

export function hasNativeWrappedTokenRiskAlias(symbol: string | null | undefined): boolean {
	return getTokenRiskSymbolAliases(symbol).size > 1
}

function buildAssetKey(chain: string, address: string, symbol?: string | null): string {
	const normalizedAddress = normalizeRiskAssetAddress(address)
	const normalizedChain = normalizeChain(chain)

	if (normalizedAddress === CANONICAL_NATIVE_TOKEN_ADDRESS) {
		const normalizedSymbol = normalizeSymbol(symbol)
		return normalizedSymbol
			? `${normalizedChain}:native:${normalizedSymbol}`
			: `${normalizedChain}:${normalizedAddress}`
	}

	return `${normalizedChain}:${normalizedAddress}`
}

function hasActionableRiskMetrics(
	row: Pick<TokenRiskExposureRow, 'currentMaxBorrowUsd' | 'minBadDebtAtPriceZeroUsd'>
): boolean {
	if (row.currentMaxBorrowUsd > 0) return true
	return (row.minBadDebtAtPriceZeroUsd ?? 0) > 0
}

export function resolveTokenRiskCandidates(
	geckoId: string | null | undefined,
	tokenSymbol: string | null | undefined,
	protocolLlamaswapDataset: ProtocolLlamaswapMetadata | null | undefined
): TokenRiskCandidate[] {
	if (!geckoId || !protocolLlamaswapDataset?.[geckoId]?.length) return []

	const seen = new Set<string>()
	const candidates: TokenRiskCandidate[] = []

	for (const chainEntry of protocolLlamaswapDataset[geckoId] ?? []) {
		const chain = chainEntry.chain?.trim()
		const address = normalizeAddress(chainEntry.address)
		if (!chain || !address) continue

		const key = buildAssetKey(chain, address, tokenSymbol)
		if (seen.has(key)) continue
		seen.add(key)

		candidates.push({
			key,
			chain,
			address: normalizeRiskAssetAddress(address),
			displayName: chainEntry.displayName || chain
		})
	}

	return candidates
}

export function inferTokenRiskCandidatesFromBorrowCapacity({
	tokenSymbol,
	tokens,
	chainDisplayNames
}: {
	tokenSymbol: string | null | undefined
	tokens: TokenRiskBorrowCapacityTokenEntry[]
	chainDisplayNames?: Map<string, string>
}): TokenRiskCandidate[] {
	const tokenSymbolAliases = getTokenRiskSymbolAliases(tokenSymbol)
	if (tokenSymbolAliases.size === 0) return []

	const seen = new Set<string>()
	const candidates: TokenRiskCandidate[] = []

	for (const token of tokens) {
		if (!tokenSymbolAliases.has(normalizeSymbol(token.asset.symbol))) continue

		const address = normalizeAddress(token.asset.address)
		if (!address) continue

		const key = buildAssetKey(token.chain, address, token.asset.symbol)
		if (seen.has(key)) continue
		seen.add(key)

		candidates.push({
			key,
			chain: token.chain,
			address: normalizeRiskAssetAddress(address),
			displayName: chainDisplayNames?.get(token.chain) ?? token.chain
		})
	}

	return candidates
}

export function mergeTokenRiskCandidates(
	primaryCandidates: TokenRiskCandidate[],
	supplementalCandidates: TokenRiskCandidate[]
): TokenRiskCandidate[] {
	if (primaryCandidates.length === 0) return supplementalCandidates
	if (supplementalCandidates.length === 0) return primaryCandidates

	const seen = new Set<string>()
	const candidates: TokenRiskCandidate[] = []

	for (const candidate of [...primaryCandidates, ...supplementalCandidates]) {
		if (seen.has(candidate.key)) continue
		seen.add(candidate.key)
		candidates.push(candidate)
	}

	return candidates
}

export function indexBorrowCapacityByAssetKey(
	tokens: TokenRiskBorrowCapacityTokenEntry[]
): Map<string, TokenRiskBorrowCapacityTokenEntry[]> {
	const indexedTokens = new Map<string, TokenRiskBorrowCapacityTokenEntry[]>()

	for (const token of tokens) {
		const key = buildAssetKey(token.chain, token.asset.address, token.asset.symbol)
		const existing = indexedTokens.get(key)
		if (existing) {
			existing.push(token)
			continue
		}

		indexedTokens.set(key, [token])
	}

	return indexedTokens
}

export function filterTokenRiskCandidatesWithData(
	candidates: TokenRiskCandidate[],
	indexedTokens: Map<string, TokenRiskBorrowCapacityTokenEntry[]>
): TokenRiskCandidate[] {
	return candidates.filter((candidate) => {
		const tokens = indexedTokens.get(candidate.key)
		return Boolean(tokens && tokens.length > 0)
	})
}

export function mergeIndexedBorrowCapacity(
	indexedTokens: Map<string, TokenRiskBorrowCapacityTokenEntry[]>,
	candidateKeys: string[]
): TokenRiskBorrowCapacityTokenEntry[] {
	if (candidateKeys.length === 0) return []

	const merged: TokenRiskBorrowCapacityTokenEntry[] = []

	for (const candidateKey of candidateKeys) {
		const tokens = indexedTokens.get(candidateKey)
		if (!tokens) continue
		merged.push(...tokens)
	}

	return merged
}

export function buildExposuresSection(
	tokens: TokenRiskBorrowCapacityTokenEntry[],
	methodologies: Pick<
		TokenRiskBorrowCapacityMethodologies,
		'asset' | 'collateralMaxBorrowUsdLiquidity' | 'minBadDebtAtPriceZeroUsd'
	>,
	displayLookups?: TokenRiskDisplayLookups
): TokenRiskExposuresSection {
	type GroupedExposureRow = TokenRiskExposureRow & {
		minBadDebtKnownInputs: number
		minBadDebtUnknownInputs: number
	}

	const groupedRows = new Map<string, GroupedExposureRow>()

	for (const token of tokens) {
		for (const protocolEntry of token.byProtocol) {
			const groupKey = `${protocolEntry.protocol}|${token.chain}|${normalizeAddress(token.asset.address)}`
			const existing = groupedRows.get(groupKey)

			if (existing) {
				existing.currentMaxBorrowUsd += protocolEntry.collateralMaxBorrowUsdLiquidity
				if (protocolEntry.minBadDebtAtPriceZeroUsd == null) {
					existing.minBadDebtUnknownInputs += 1
				} else {
					existing.minBadDebtAtPriceZeroUsd =
						(existing.minBadDebtAtPriceZeroUsd ?? 0) + protocolEntry.minBadDebtAtPriceZeroUsd
					existing.minBadDebtKnownInputs += 1
				}
				continue
			}

			groupedRows.set(groupKey, {
				protocol: protocolEntry.protocol,
				protocolDisplayName: displayLookups?.protocolDisplayNames.get(protocolEntry.protocol) ?? protocolEntry.protocol,
				chain: token.chain,
				chainDisplayName: displayLookups?.chainDisplayNames.get(token.chain) ?? token.chain,
				assetSymbol: token.asset.symbol,
				assetAddress: normalizeAddress(token.asset.address),
				currentMaxBorrowUsd: protocolEntry.collateralMaxBorrowUsdLiquidity,
				minBadDebtAtPriceZeroUsd: protocolEntry.minBadDebtAtPriceZeroUsd,
				minBadDebtAtPriceZeroCoverage: protocolEntry.minBadDebtAtPriceZeroUsd == null ? 'unavailable' : 'known',
				minBadDebtKnownInputs: protocolEntry.minBadDebtAtPriceZeroUsd == null ? 0 : 1,
				minBadDebtUnknownInputs: protocolEntry.minBadDebtAtPriceZeroUsd == null ? 1 : 0
			})
		}
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
		.filter(hasActionableRiskMetrics)
		.sort((a, b) => {
			if (a.currentMaxBorrowUsd !== b.currentMaxBorrowUsd) {
				return b.currentMaxBorrowUsd - a.currentMaxBorrowUsd
			}

			return a.protocolDisplayName.localeCompare(b.protocolDisplayName)
		})

	const totalCurrentMaxBorrowUsd = tokens.reduce((sum, token) => sum + token.totals.collateralMaxBorrowUsdLiquidity, 0)
	const minBadDebtRowsWithKnownValues = rows.filter((row) => row.minBadDebtAtPriceZeroUsd != null)
	const totalMinBadDebtAtPriceZeroUsd =
		minBadDebtRowsWithKnownValues.length > 0
			? minBadDebtRowsWithKnownValues.reduce((sum, row) => sum + (row.minBadDebtAtPriceZeroUsd ?? 0), 0)
			: null
	const minBadDebtKnownCount = rows.filter((row) => row.minBadDebtAtPriceZeroCoverage === 'known').length
	const minBadDebtUnknownCount = rows.length - minBadDebtKnownCount

	return {
		summary: {
			totalCurrentMaxBorrowUsd,
			totalMinBadDebtAtPriceZeroUsd,
			exposureCount: rows.length,
			protocolCount: new Set(rows.map((row) => row.protocol)).size,
			chainCount: new Set(rows.map((row) => row.chain)).size,
			minBadDebtKnownCount,
			minBadDebtUnknownCount
		},
		rows,
		methodologies: {
			asset: methodologies.asset,
			currentMaxBorrowUsd: methodologies.collateralMaxBorrowUsdLiquidity,
			minBadDebtAtPriceZeroUsd: methodologies.minBadDebtAtPriceZeroUsd
		}
	}
}
