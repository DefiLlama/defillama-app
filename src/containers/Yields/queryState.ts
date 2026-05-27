import type { ParsedUrlQuery } from 'querystring'
import { parseExcludeParam, parseNumberQueryParam } from '~/utils/routerQuery'
import {
	ALL_POOL_COLUMN_QUERY_KEYS,
	POOL_QUERY_KEY_TO_COLUMN_ID,
	type PoolColumnQueryKey,
	type PoolOptionalColumnId
} from './Filters/poolColumns'

export interface DecodeYieldsQueryContext {
	projectList?: Array<string>
	lendingProtocols?: Array<string>
	farmProtocols?: Array<string>
	chainList?: Array<string>
	categoryList?: Array<string>
	evmChains?: Array<string>
	tokenQueryKey?: string
	excludeTokenQueryKey?: string
	exactTokenQueryKey?: string
}

export interface DecodedYieldsQuery {
	selectedProjects: string[]
	selectedChains: string[]
	selectedAttributes: string[]
	includeTokens: string[]
	excludeTokens: string[]
	exactTokens: string[]
	selectedCategories: string[]
	selectedLendingProtocols: string[]
	selectedFarmProtocols: string[]
	pairTokens: string[]
	minTvl: number | null
	maxTvl: number | null
	minApy: number | null
	maxApy: number | null
	minAvailable: number | null
	maxAvailable: number | null
	customLTV: number | null
}

type QueryUpdatePrimitive = string | number | boolean
type QueryUpdateValue = QueryUpdatePrimitive | QueryUpdatePrimitive[] | undefined

type PoolsColumnVisibility = Record<
	PoolOptionalColumnId | 'apy' | 'apyBase' | 'apyIncludingLsdApy' | 'apyBaseIncludingLsdApy' | 'cv30d' | 'pegDeviation',
	boolean
>

function toQueryArray(value: ParsedUrlQuery[string]): string[] {
	if (typeof value === 'string') return [value]
	return Array.isArray(value) ? [...value] : []
}

function decodeQuerySelection(
	queryValue: ParsedUrlQuery[string],
	allValues?: string[],
	excludeValue?: ParsedUrlQuery[string]
): string[] {
	if (!allValues) return []

	let selectedValues: string[]
	if (queryValue) {
		if (typeof queryValue === 'string') {
			selectedValues = queryValue === 'All' ? [...allValues] : queryValue === 'None' ? [] : [queryValue]
		} else {
			selectedValues = [...queryValue]
		}
	} else {
		selectedValues = [...allValues]
	}

	const excludedSet = parseExcludeParam(excludeValue)
	if (excludedSet.size === 0) return selectedValues

	const filteredValues: string[] = []
	for (const value of selectedValues) {
		if (!excludedSet.has(value)) filteredValues.push(value)
	}
	return filteredValues
}

export function decodeYieldsQuery(
	query: ParsedUrlQuery,
	{
		projectList,
		chainList,
		categoryList,
		lendingProtocols,
		farmProtocols,
		evmChains,
		tokenQueryKey = 'token',
		excludeTokenQueryKey = 'excludeToken',
		exactTokenQueryKey = 'exactToken'
	}: DecodeYieldsQueryContext
): DecodedYieldsQuery {
	const evmChainsSet = new Set(evmChains ?? [])
	const token = query[tokenQueryKey]
	const excludeToken = query[excludeTokenQueryKey]
	const exactToken = query[exactTokenQueryKey]

	const selectedProjects = decodeQuerySelection(query.project, projectList, query.excludeProject)
	const selectedCategories = decodeQuerySelection(query.category, categoryList, query.excludeCategory)
	const selectedLendingProtocols = decodeQuerySelection(
		query.lendingProtocol,
		lendingProtocols,
		query.excludeLendingProtocol
	)
	const selectedFarmProtocols = decodeQuerySelection(query.farmProtocol, farmProtocols, query.excludeFarmProtocol)

	let selectedChains: string[] = []
	if (chainList) {
		const isEvmChain = (chain: string) => evmChainsSet.has(chain) || evmChainsSet.has(chain.toLowerCase())
		if (query.chain) {
			if (typeof query.chain === 'string') {
				if (query.chain === 'All') {
					selectedChains = [...chainList]
				} else if (query.chain === 'None') {
					selectedChains = []
				} else if (query.chain === 'ALL_EVM') {
					for (const chain of chainList) {
						if (isEvmChain(chain)) selectedChains.push(chain)
					}
				} else {
					selectedChains = [query.chain]
				}
			} else if (query.chain.includes('ALL_EVM')) {
				const selectedChainsSet = new Set<string>()
				for (const value of query.chain) {
					if (value !== 'ALL_EVM') selectedChainsSet.add(value)
				}
				for (const chain of chainList) {
					if (isEvmChain(chain)) selectedChainsSet.add(chain)
				}
				selectedChains = Array.from(selectedChainsSet)
			} else {
				selectedChains = [...query.chain]
			}
		} else {
			selectedChains = [...chainList]
		}

		const excludedChainSet = parseExcludeParam(query.excludeChain)
		if (excludedChainSet.size > 0) {
			const filteredChains: string[] = []
			for (const chain of selectedChains) {
				if (!excludedChainSet.has(chain)) filteredChains.push(chain)
			}
			selectedChains = filteredChains
		}
	}

	const selectedAttributes: string[] = []
	const excludedAttributeSet = parseExcludeParam(query.excludeAttribute)
	for (const attribute of toQueryArray(query.attribute)) {
		if (!excludedAttributeSet.has(attribute)) selectedAttributes.push(attribute)
	}
	const includeTokens = toQueryArray(token)
	const excludeTokens = toQueryArray(excludeToken)
	const exactTokens = toQueryArray(exactToken)
	const pairTokens = toQueryArray(query.token_pair)

	return {
		selectedProjects,
		selectedChains,
		selectedAttributes,
		includeTokens,
		excludeTokens,
		exactTokens,
		selectedCategories,
		selectedLendingProtocols,
		selectedFarmProtocols,
		pairTokens,
		minTvl: parseNumberQueryParam(query.minTvl),
		maxTvl: parseNumberQueryParam(query.maxTvl),
		minApy: parseNumberQueryParam(query.minApy),
		maxApy: parseNumberQueryParam(query.maxApy),
		minAvailable: parseNumberQueryParam(query.minAvailable),
		maxAvailable: parseNumberQueryParam(query.maxAvailable),
		customLTV: parseNumberQueryParam(query.customLTV)
	}
}

export function isActiveYieldsQueryValue(value: ParsedUrlQuery[string]) {
	return Array.isArray(value) ? value.length > 0 : value != null && value !== ''
}

export function hasActiveYieldsQueries(query: ParsedUrlQuery, keys: readonly string[]) {
	return keys.some((key) => isActiveYieldsQueryValue(query[key]))
}

export function clearYieldsQueries(keys: readonly string[]) {
	const updates: Record<string, undefined> = {}
	for (const key of keys) {
		updates[key] = undefined
	}
	return updates
}

export function shouldResetYieldsPoolPage(pathname: string | undefined) {
	return (
		pathname === '/yields' ||
		pathname === '/yields/stablecoins' ||
		pathname === '/yields/loop' ||
		pathname === '/yields/strategy' ||
		pathname === '/yields/strategy-long-short' ||
		pathname === '/yields/halal'
	)
}

export function resetYieldsPoolPageOnFilterChange<T extends Record<string, QueryUpdateValue>>(
	pathname: string | undefined,
	updates: T
): T & { page?: undefined } {
	return shouldResetYieldsPoolPage(pathname) ? { ...updates, page: undefined } : updates
}

export function decodePoolsColumnVisibilityQuery(
	query: ParsedUrlQuery,
	{
		hasPremiumAccess,
		includeLsdApy,
		isStablecoinPage
	}: {
		hasPremiumAccess: boolean
		includeLsdApy: boolean
		isStablecoinPage: boolean
	}
): PoolsColumnVisibility {
	const optionalColumnVisibility = {} as Record<PoolOptionalColumnId, boolean>
	for (const queryKey of ALL_POOL_COLUMN_QUERY_KEYS) {
		const columnId = POOL_QUERY_KEY_TO_COLUMN_ID[queryKey]
		const isVisible = query[queryKey] === 'true'
		const premiumBlocked = (queryKey === 'showMedianApy' || queryKey === 'showStdDev') && !hasPremiumAccess
		optionalColumnVisibility[columnId] = premiumBlocked ? false : isVisible
	}

	return {
		...optionalColumnVisibility,
		apy: !includeLsdApy,
		apyBase: !includeLsdApy,
		apyIncludingLsdApy: includeLsdApy,
		apyBaseIncludingLsdApy: includeLsdApy,
		cv30d: true,
		pegDeviation: isStablecoinPage
	}
}

export const POOLS_FILTER_QUERY_KEYS = [
	'project',
	'excludeProject',
	'chain',
	'excludeChain',
	'attribute',
	'excludeAttribute',
	'category',
	'excludeCategory',
	'token',
	'excludeToken',
	'exactToken',
	'token_pair',
	'minTvl',
	'maxTvl',
	'minApy',
	'maxApy',
	'includeLsdApy',
	...ALL_POOL_COLUMN_QUERY_KEYS
] as const

const ALL_POOL_COLUMN_QUERY_KEYS_SET = new Set<string>(ALL_POOL_COLUMN_QUERY_KEYS)
const poolsFilterOnlyQueryKeys: Array<Exclude<(typeof POOLS_FILTER_QUERY_KEYS)[number], PoolColumnQueryKey>> = []
for (const queryKey of POOLS_FILTER_QUERY_KEYS) {
	if (!ALL_POOL_COLUMN_QUERY_KEYS_SET.has(queryKey)) {
		poolsFilterOnlyQueryKeys.push(queryKey as Exclude<(typeof POOLS_FILTER_QUERY_KEYS)[number], PoolColumnQueryKey>)
	}
}
export const POOLS_FILTER_ONLY_QUERY_KEYS = poolsFilterOnlyQueryKeys
