import { attributeOptions, attributeOptionsMap } from '../Filters/Attributes'
import type { YieldPool, YieldTokenCategories, YieldView } from '../types'

const TETHER_SYMBOL_PATTERN = /₮0?/gu

export function normalizeYieldToken(token: string): string {
	const normalizedToken = token.normalize('NFKC').trim().toLowerCase().replaceAll(TETHER_SYMBOL_PATTERN, 't')

	return normalizedToken === 't' ? 'usdt' : normalizedToken
}

export function extractYieldPoolTokens(symbol: string): string[] {
	const tokens: string[] = []
	const poolSymbol = symbol.split('(')[0]
	for (const token of poolSymbol.split('-')) {
		const normalizedToken = normalizeYieldToken(token)
		if (normalizedToken) tokens.push(normalizedToken)
	}
	return tokens
}

type YieldPoolTokens = { array: string[]; set: Set<string> }

// Memoize the NFKC-heavy token extraction per pool object; callers read only.
// Dataset refreshes mint new pool refs, so the WeakMap drops stale entries automatically.
const poolTokensCache = new WeakMap<object, YieldPoolTokens>()

export function getYieldPoolTokens(pool: { symbol?: string | null }): YieldPoolTokens {
	const cached = poolTokensCache.get(pool)
	if (cached) return cached
	const array = pool.symbol ? extractYieldPoolTokens(pool.symbol) : []
	const entry: YieldPoolTokens = { array, set: new Set(array) }
	poolTokensCache.set(pool, entry)
	return entry
}

type TokenCategory = { addresses: string[]; symbols: string[]; label: string; filterKey: string }

function findTokenCategory(token: string, tokenCategories: YieldTokenCategories): TokenCategory | undefined {
	for (const key in tokenCategories) {
		const category = tokenCategories[key]
		if (category.filterKey?.toLowerCase() === token) return category
	}
	return undefined
}

function poolMatchesTokenCategory(
	curr: YieldPool,
	tokensInPool: string[],
	category: TokenCategory,
	poolTokenIndex?: number
) {
	const { addresses: catAddresses, symbols: catSymbols } = category
	const underlyingTokens = curr.underlyingTokens ?? []
	const chainMapping: Record<string, string> = {
		avalanche: 'avax',
		gnosis: 'xdai'
	}
	let chain = curr.chain?.toLowerCase()
	chain = chainMapping[chain] ?? chain

	if (underlyingTokens.length > 0) {
		const addressSet = new Set(catAddresses)
		if (poolTokenIndex != null) {
			const addr = underlyingTokens[poolTokenIndex]
			return !!addr && addressSet.has(`${chain}:${addr.toLowerCase().replaceAll('/', ':')}`)
		}
		for (const addr of underlyingTokens) {
			if (addr && addressSet.has(`${chain}:${addr.toLowerCase().replaceAll('/', ':')}`)) return true
		}
		return false
	}

	if (catSymbols?.length > 0) {
		const symbolSet = new Set(catSymbols)
		if (poolTokenIndex != null) return symbolSet.has(tokensInPool[poolTokenIndex])
		for (const sym of tokensInPool) {
			if (symbolSet.has(sym)) return true
		}
		return false
	}

	return false
}

function poolTokenMatchesToken(
	poolToken: string,
	poolTokenIndex: number,
	token: string,
	curr: YieldPool,
	tokensInPool: string[],
	normalizedUsdPeggedSymbols: string[],
	tokenCategories: YieldTokenCategories
): boolean {
	if (token === 'all_bitcoins') {
		return poolToken.includes('btc')
	}

	if (token === 'all_usd_stables') {
		for (const usd of normalizedUsdPeggedSymbols) {
			if (poolToken.includes(usd)) return true
		}
		return false
	}

	const categoryEntry = findTokenCategory(token, tokenCategories)
	if (categoryEntry) {
		return poolMatchesTokenCategory(curr, tokensInPool, categoryEntry, poolTokenIndex)
	}

	return poolToken === token || poolToken === `w${token}`
}

function tokensMatchPair({
	curr,
	tokensInPool,
	pairParts,
	normalizedUsdPeggedSymbols,
	tokenCategories
}: {
	curr: YieldPool
	tokensInPool: string[]
	pairParts: string[]
	normalizedUsdPeggedSymbols: string[]
	tokenCategories: YieldTokenCategories
}): boolean {
	if (tokensInPool.length !== pairParts.length) return false

	const matchedPoolTokenIndexes = new Set<number>()

	const matchPairPart = (pairPartIndex: number): boolean => {
		if (pairPartIndex === pairParts.length) return true

		const pairPart = pairParts[pairPartIndex]
		for (let poolTokenIndex = 0; poolTokenIndex < tokensInPool.length; poolTokenIndex++) {
			if (matchedPoolTokenIndexes.has(poolTokenIndex)) continue
			if (
				!poolTokenMatchesToken(
					tokensInPool[poolTokenIndex],
					poolTokenIndex,
					pairPart,
					curr,
					tokensInPool,
					normalizedUsdPeggedSymbols,
					tokenCategories
				)
			) {
				continue
			}

			matchedPoolTokenIndexes.add(poolTokenIndex)
			if (matchPairPart(pairPartIndex + 1)) return true
			matchedPoolTokenIndexes.delete(poolTokenIndex)
		}

		return false
	}

	return matchPairPart(0)
}

interface YieldPoolQueryMatchOptions {
	curr: YieldPool
	selectedProjectsSet: Set<string>
	selectedChainsSet: Set<string>
	selectedAttributes: string[]
	includeTokens: string[]
	exactTokens: string[]
	selectedCategoriesSet: Set<string>
	excludeTokensSet: Set<string>
	view: YieldView
	minTvl: number | null
	maxTvl: number | null
	minApy: number | null
	maxApy: number | null
	pairTokens: string[]
	usdPeggedSymbols: string[]
	tokenCategories?: YieldTokenCategories
}

function viewPathForDefaultPredicates(view: YieldView): string | null {
	switch (view) {
		case 'main':
			return '/yields'
		case 'stablecoins':
			return '/yields/stablecoins'
		default:
			return null
	}
}

// Compatibility note: this module intentionally preserves legacy token and range quirks for a structure-only refactor.
// Broad include-token matching, stricter exact matching, exact exclude matching, pair-token precedence, inclusive TVL
// bounds, and exclusive APY bounds should only change in a separate behavior-change PR.
export function matchesYieldPoolForQuery({
	curr,
	selectedProjectsSet,
	selectedChainsSet,
	selectedAttributes,
	includeTokens,
	excludeTokensSet,
	exactTokens,
	selectedCategoriesSet,
	view,
	minTvl,
	maxTvl,
	minApy,
	maxApy,
	pairTokens,
	usdPeggedSymbols,
	tokenCategories = {}
}: YieldPoolQueryMatchOptions) {
	const { array: tokensInPool, set: tokensInPoolSet } = getYieldPoolTokens(curr)

	let toFilter = true
	const defaultPathname = viewPathForDefaultPredicates(view)

	for (const option of attributeOptions) {
		if (defaultPathname && option.defaultFilterFnOnPage[defaultPathname]) {
			toFilter = toFilter && option.defaultFilterFnOnPage[defaultPathname](curr)
		}

		if (view === 'main' && option.key === 'apy_zero' && !selectedAttributes.includes(option.key)) {
			toFilter = toFilter && curr.apy > 0
		}
	}

	for (const attribute of selectedAttributes) {
		const attributeOption = attributeOptionsMap.get(attribute)

		if (attributeOption) {
			toFilter = toFilter && attributeOption.filterFn(curr)
		}
	}

	toFilter = toFilter && selectedProjectsSet.has(curr.projectName)
	toFilter = toFilter && selectedChainsSet.has(curr.chain)
	toFilter = toFilter && selectedCategoriesSet.has(curr.category)

	if (pairTokens.length > 0) {
		let atLeastOnePairToken = false
		const normalizedUsdPeggedSymbols: string[] = []
		for (const symbol of usdPeggedSymbols) {
			normalizedUsdPeggedSymbols.push(normalizeYieldToken(symbol))
		}
		for (const pairToken of pairTokens) {
			const pt = pairToken.split('-')
			if (
				tokensMatchPair({
					curr,
					tokensInPool,
					pairParts: pt,
					normalizedUsdPeggedSymbols,
					tokenCategories
				})
			) {
				atLeastOnePairToken = true
				break
			}
		}

		toFilter = toFilter && atLeastOnePairToken
	} else if (exactTokens.length === 0) {
		let includeToken = true
		if (includeTokens.length > 0 && includeTokens[0] !== 'all') {
			includeToken = false
			for (const token of includeTokens) {
				if (token === 'all_bitcoins') {
					for (const x of tokensInPool) {
						if (x.includes('btc')) {
							includeToken = true
							break
						}
					}
				} else if (token === 'all_usd_stables') {
					if (curr.stablecoin && usdPeggedSymbols.length > 0 && tokensInPool.length > 0) {
						const normalizedUsdPeggedSymbols: string[] = []
						for (const symbol of usdPeggedSymbols) {
							normalizedUsdPeggedSymbols.push(normalizeYieldToken(symbol))
						}
						includeToken = true
						for (const sym of tokensInPool) {
							let isUsdPegged = false
							for (const usd of normalizedUsdPeggedSymbols) {
								if (sym.includes(usd)) {
									isUsdPegged = true
									break
								}
							}
							if (!isUsdPegged) {
								includeToken = false
								break
							}
						}
					}
				} else {
					const categoryEntry = findTokenCategory(token, tokenCategories)
					if (categoryEntry) {
						includeToken = poolMatchesTokenCategory(curr, tokensInPool, categoryEntry)
					} else {
						for (const x of tokensInPool) {
							if (x.includes(token) || (token === 'eth' && x.includes('weth') && x.includes(token))) {
								includeToken = true
								break
							}
						}
					}
				}
				if (includeToken) break
			}
		}

		let hasExcludedToken = false
		for (const token of excludeTokensSet) {
			if (tokensInPoolSet.has(token)) {
				hasExcludedToken = true
				break
			}
		}

		toFilter = toFilter && includeToken && !hasExcludedToken
	} else {
		let exactToken = false
		for (const token of exactTokens) {
			if (tokensInPoolSet.has(token)) {
				exactToken = true
				break
			} else if (token === 'eth') {
				for (const x of tokensInPool) {
					if (x.includes('weth')) {
						exactToken = true
						break
					}
				}
			}
			if (exactToken) break
		}

		toFilter = toFilter && exactToken
	}

	const isValidTvlRange = minTvl != null || maxTvl != null
	const isValidApyRange = minApy != null || maxApy != null

	if (isValidTvlRange) {
		toFilter =
			toFilter && (minTvl != null ? curr.tvlUsd >= minTvl : true) && (maxTvl != null ? curr.tvlUsd <= maxTvl : true)
	}

	if (isValidApyRange) {
		toFilter = toFilter && (minApy != null ? curr.apy > minApy : true) && (maxApy != null ? curr.apy < maxApy : true)
	}

	return toFilter
}

export interface YieldPoolFilterState {
	selectedProjects: string[]
	selectedChains: string[]
	selectedAttributes: string[]
	includeTokens: string[]
	excludeTokens: string[]
	exactTokens?: string[]
	selectedCategories: string[]
	pairTokens?: string[]
	minTvl: number | null
	maxTvl: number | null
	minApy: number | null
	maxApy: number | null
}

export function filterYieldPools({
	pools,
	view,
	filters,
	usdPeggedSymbols = [],
	tokenCategories
}: {
	pools: YieldPool[]
	view: YieldView
	filters: YieldPoolFilterState
	usdPeggedSymbols?: string[]
	tokenCategories?: YieldTokenCategories
}): YieldPool[] {
	const selectedProjectsSet = new Set(filters.selectedProjects)
	const selectedChainsSet = new Set(filters.selectedChains)
	const selectedCategoriesSet = new Set(filters.selectedCategories)
	const includeTokens: string[] = []
	for (const token of filters.includeTokens) {
		includeTokens.push(normalizeYieldToken(token))
	}
	const excludeTokensSet = new Set<string>()
	for (const token of filters.excludeTokens) {
		excludeTokensSet.add(normalizeYieldToken(token))
	}
	const exactTokens: string[] = []
	for (const token of filters.exactTokens ?? []) {
		exactTokens.push(normalizeYieldToken(token))
	}
	const pairTokens: string[] = []
	for (const token of filters.pairTokens ?? []) {
		pairTokens.push(normalizeYieldToken(token))
	}
	const filteredPools: YieldPool[] = []

	for (const curr of pools) {
		if (
			matchesYieldPoolForQuery({
				curr,
				view,
				selectedProjectsSet,
				selectedChainsSet,
				selectedAttributes: filters.selectedAttributes,
				includeTokens,
				excludeTokensSet,
				exactTokens,
				selectedCategoriesSet,
				minTvl: filters.minTvl,
				maxTvl: filters.maxTvl,
				minApy: filters.minApy,
				maxApy: filters.maxApy,
				pairTokens,
				usdPeggedSymbols,
				tokenCategories
			})
		) {
			filteredPools.push(curr)
		}
	}

	return filteredPools
}
