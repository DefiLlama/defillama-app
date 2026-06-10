import { parseNumberQueryParam } from '~/utils/routerQuery'
import type { FormattedStablecoinAsset } from './utils'

type QueryParamInput = string | string[] | undefined | null

type StablecoinFilterableItem = Pick<
	FormattedStablecoinAsset,
	'pegDeviation' | 'yieldBearing' | 'pegMechanism' | 'pegType' | 'mcap'
>

export type StablecoinFilterOption = {
	name: string
	key: string
	filterFn: (item: StablecoinFilterableItem) => boolean
	help: string
}

export type StablecoinFilterQuery = {
	attribute?: QueryParamInput
	excludeAttribute?: QueryParamInput
	pegtype?: QueryParamInput
	excludePegtype?: QueryParamInput
	backing?: QueryParamInput
	excludeBacking?: QueryParamInput
	minMcap?: QueryParamInput
	maxMcap?: QueryParamInput
}

export type StablecoinFilterState = {
	selectedAttributes: string[]
	selectedPegTypes: string[]
	selectedBackings: string[]
	minMcap: number | null
	maxMcap: number | null
	hasActiveFilters: boolean
}

export const stablecoinAttributeOptions: StablecoinFilterOption[] = [
	{
		name: 'Stable',
		key: 'STABLE',
		filterFn: (item) => typeof item.pegDeviation === 'number' && Math.abs(item.pegDeviation) <= 10,
		help: 'Show stablecoins within 10% of peg'
	},
	{
		name: 'Yield Bearing',
		key: 'YIELDBEARING',
		filterFn: (item) => !!item.yieldBearing,
		help: 'Show yield-bearing stablecoins'
	},
	{
		name: 'Unknown',
		key: 'UNKNOWN',
		filterFn: (item) => typeof item.pegDeviation !== 'number',
		help: 'Show stablecoins with no deviation data'
	},
	{
		name: 'Depegged',
		key: 'DEPEGGED',
		// Yield-bearing assets intentionally render '-' for peg deviation columns,
		// so exclude them from the "Depegged" filter to avoid showing "no peg data" rows.
		filterFn: (item) =>
			!item.yieldBearing &&
			typeof item.pegDeviation === 'number' &&
			Number.isFinite(item.pegDeviation) &&
			Math.abs(item.pegDeviation) > 10,
		help: 'Show stablecoins depegged by more than 10%'
	}
]

export const stablecoinBackingOptions: StablecoinFilterOption[] = [
	{
		name: 'Fiat',
		key: 'FIATSTABLES',
		filterFn: (item) => item.pegMechanism === 'fiat-backed',
		help: 'Show stablecoins backed by fiat'
	},
	{
		name: 'Crypto',
		key: 'CRYPTOSTABLES',
		filterFn: (item) => item.pegMechanism === 'crypto-backed',
		help: 'Show stablecoins backed by crypto'
	},
	{
		name: 'Algorithmic',
		key: 'ALGOSTABLES',
		filterFn: (item) => item.pegMechanism === 'algorithmic',
		help: 'Show algorithmic stablecoins'
	}
]

export const stablecoinPegTypeOptions: StablecoinFilterOption[] = [
	{
		name: 'USD',
		key: 'PEGGEDUSD',
		filterFn: (item) => item.pegType === 'peggedUSD',
		help: 'Show stablecoins pegged to USD'
	},
	{
		name: 'EUR',
		key: 'PEGGEDEUR',
		filterFn: (item) => item.pegType === 'peggedEUR',
		help: 'Show stablecoins pegged to EUR'
	},
	{
		name: 'SGD',
		key: 'PEGGEDSGD',
		filterFn: (item) => item.pegType === 'peggedSGD',
		help: 'Show stablecoins pegged to SGD'
	},
	{
		name: 'JPY',
		key: 'PEGGEDJPY',
		filterFn: (item) => item.pegType === 'peggedJPY',
		help: 'Show stablecoins pegged to JPY'
	},
	{
		name: 'CNY',
		key: 'PEGGEDCNY',
		filterFn: (item) => item.pegType === 'peggedCNY',
		help: 'Show stablecoins pegged to CNY'
	},
	{
		name: 'UAH',
		key: 'PEGGEDUAH',
		filterFn: (item) => item.pegType === 'peggedUAH',
		help: 'Show stablecoins pegged to UAH'
	},
	{
		name: 'ARS',
		key: 'PEGGEDARS',
		filterFn: (item) => item.pegType === 'peggedARS',
		help: 'Show stablecoins pegged to ARS'
	},
	{
		name: 'GBP',
		key: 'PEGGEDGBP',
		filterFn: (item) => item.pegType === 'peggedGBP',
		help: 'Show stablecoins pegged to GBP'
	},
	{
		name: 'Variable',
		key: 'PEGGEDVAR',
		filterFn: (item) => item.pegType === 'peggedVAR',
		help: 'Show stablecoins with a variable or floating peg'
	},
	{
		name: 'CAD',
		key: 'PEGGEDCAD',
		filterFn: (item) => item.pegType === 'peggedCAD',
		help: 'Show stablecoins pegged to CAD'
	},
	{
		name: 'AUD',
		key: 'PEGGEDAUD',
		filterFn: (item) => item.pegType === 'peggedAUD',
		help: 'Show stablecoins pegged to AUD'
	},
	{
		name: 'TRY',
		key: 'PEGGEDTRY',
		filterFn: (item) => item.pegType === 'peggedTRY',
		help: 'Show stablecoins pegged to Turkish Lira'
	},
	{
		name: 'CHF',
		key: 'PEGGEDCHF',
		filterFn: (item) => item.pegType === 'peggedCHF',
		help: 'Show stablecoins pegged to Swiss Franc'
	},
	{
		name: 'COP',
		key: 'PEGGEDCOP',
		filterFn: (item) => item.pegType === 'peggedCOP',
		help: 'Show stablecoins pegged to Colombian Peso'
	},
	{
		name: 'REAL',
		key: 'PEGGEDREAL',
		filterFn: (item) => item.pegType === 'peggedREAL',
		help: 'Show stablecoins pegged to Brazilian Real'
	},
	{
		name: 'RUB',
		key: 'PEGGEDRUB',
		filterFn: (item) => item.pegType === 'peggedRUB',
		help: 'Show stablecoins pegged to Russian Ruble'
	},
	{
		name: 'PHP',
		key: 'PEGGEDPHP',
		filterFn: (item) => item.pegType === 'peggedPHP',
		help: 'Show stablecoins pegged to Philippine Peso'
	},
	{
		name: 'MXN',
		key: 'PEGGEDMXN',
		filterFn: (item) => item.pegType === 'peggedMXN',
		help: 'Show stablecoins pegged to Mexican Peso'
	},
	{
		name: 'KES',
		key: 'PEGGEDKES',
		filterFn: (item) => item.pegType === 'peggedKES',
		help: 'Show stablecoins pegged to Kenyan Shilling'
	},
	{
		name: 'ZAR',
		key: 'PEGGEDZAR',
		filterFn: (item) => item.pegType === 'peggedZAR',
		help: 'Show stablecoins pegged to South African Rand'
	},
	{
		name: 'NGN',
		key: 'PEGGEDNGN',
		filterFn: (item) => item.pegType === 'peggedNGN',
		help: 'Show stablecoins pegged to Nigerian Naira'
	},
	{
		name: 'XOF',
		key: 'PEGGEDXOF',
		filterFn: (item) => item.pegType === 'peggedXOF',
		help: 'Show stablecoins pegged to West African CFA Franc'
	},
	{
		name: 'GHS',
		key: 'PEGGEDGHS',
		filterFn: (item) => item.pegType === 'peggedGHS',
		help: 'Show stablecoins pegged to Ghanaian Cedi'
	}
]

const filterQueryKeys: Array<keyof StablecoinFilterQuery> = [
	'attribute',
	'excludeAttribute',
	'pegtype',
	'excludePegtype',
	'backing',
	'excludeBacking',
	'minMcap',
	'maxMcap'
]

const legacyFilterKeyAliases: Record<string, string> = {
	deppeged: 'DEPEGGED',
	unknow: 'UNKNOWN'
}

const hasQueryValue = (value: QueryParamInput): boolean => {
	if (value == null) return false
	if (Array.isArray(value)) return value.length > 0
	return value !== ''
}

const getOptionKeyByLower = (options: ReadonlyArray<StablecoinFilterOption>): Map<string, string> => {
	const optionKeyByLower = new Map<string, string>()
	for (const option of options) {
		optionKeyByLower.set(option.key.toLowerCase(), option.key)
	}
	return optionKeyByLower
}

const getFilterOptionMap = (options: ReadonlyArray<StablecoinFilterOption>): Map<string, StablecoinFilterOption> => {
	const map = new Map<string, StablecoinFilterOption>()
	for (const option of options) {
		map.set(option.key, option)
	}
	return map
}

const normalizeFilterKey = (raw: string, optionKeyByLower: Map<string, string>): string | null => {
	const lower = raw.toLowerCase()
	const alias = legacyFilterKeyAliases[lower]
	if (alias && optionKeyByLower.has(alias.toLowerCase())) return alias
	return optionKeyByLower.get(lower) ?? null
}

export const resolveSelectedStablecoinFilterKeys = ({
	includeParam,
	excludeParam,
	options
}: {
	includeParam: QueryParamInput
	excludeParam: QueryParamInput
	options: ReadonlyArray<StablecoinFilterOption>
}): string[] => {
	const optionKeyByLower = getOptionKeyByLower(options)
	const allKeys = options.map((option) => option.key)
	const rawIncludes = Array.isArray(includeParam) ? includeParam : includeParam ? [includeParam] : []
	let selected: string[]

	if (rawIncludes.length === 0) {
		selected = allKeys
	} else if (rawIncludes.some((raw) => raw.toLowerCase() === 'none')) {
		selected = []
	} else {
		selected = []
		const seen = new Set<string>()
		for (const raw of rawIncludes) {
			const key = normalizeFilterKey(raw, optionKeyByLower)
			if (!key || seen.has(key)) continue
			selected.push(key)
			seen.add(key)
		}
	}

	const rawExcludes = Array.isArray(excludeParam) ? excludeParam : excludeParam ? [excludeParam] : []
	if (rawExcludes.length === 0 || selected.length === 0) return selected
	const excludeSet = new Set<string>()
	for (const raw of rawExcludes) {
		const key = normalizeFilterKey(raw, optionKeyByLower)
		if (key) excludeSet.add(key)
	}
	if (excludeSet.size === 0) return selected
	return selected.filter((key) => !excludeSet.has(key))
}

export const resolveStablecoinFilterState = (query: StablecoinFilterQuery = {}): StablecoinFilterState => ({
	selectedAttributes: resolveSelectedStablecoinFilterKeys({
		includeParam: query.attribute,
		excludeParam: query.excludeAttribute,
		options: stablecoinAttributeOptions
	}),
	selectedPegTypes: resolveSelectedStablecoinFilterKeys({
		includeParam: query.pegtype,
		excludeParam: query.excludePegtype,
		options: stablecoinPegTypeOptions
	}),
	selectedBackings: resolveSelectedStablecoinFilterKeys({
		includeParam: query.backing,
		excludeParam: query.excludeBacking,
		options: stablecoinBackingOptions
	}),
	minMcap: parseNumberQueryParam(query.minMcap),
	maxMcap: parseNumberQueryParam(query.maxMcap),
	hasActiveFilters: filterQueryKeys.some((key) => hasQueryValue(query[key]))
})

const stablecoinAttributeOptionsByKey = getFilterOptionMap(stablecoinAttributeOptions)
const stablecoinPegTypeOptionsByKey = getFilterOptionMap(stablecoinPegTypeOptions)
const stablecoinBackingOptionsByKey = getFilterOptionMap(stablecoinBackingOptions)

const matchesAnySelectedOption = (
	asset: StablecoinFilterableItem,
	selectedKeys: string[],
	optionsByKey: Map<string, StablecoinFilterOption>
): boolean => {
	if (selectedKeys.length === 0) return false
	for (const key of selectedKeys) {
		const option = optionsByKey.get(key)
		if (option?.filterFn(asset)) return true
	}
	return false
}

export const matchesStablecoinFilters = (asset: StablecoinFilterableItem, state: StablecoinFilterState): boolean => {
	if (!state.hasActiveFilters) return true
	if (!matchesAnySelectedOption(asset, state.selectedAttributes, stablecoinAttributeOptionsByKey)) return false
	if (!matchesAnySelectedOption(asset, state.selectedPegTypes, stablecoinPegTypeOptionsByKey)) return false
	if (!matchesAnySelectedOption(asset, state.selectedBackings, stablecoinBackingOptionsByKey)) return false

	if (state.minMcap != null || state.maxMcap != null) {
		if (asset.mcap == null) return false
		if (state.minMcap != null && asset.mcap < state.minMcap) return false
		if (state.maxMcap != null && asset.mcap > state.maxMcap) return false
	}
	return true
}

export const filterStablecoinAssets = <T extends StablecoinFilterableItem>(
	assets: T[],
	state: StablecoinFilterState
): T[] => {
	if (!state.hasActiveFilters) return assets
	const filtered: T[] = []
	for (const asset of assets) {
		if (matchesStablecoinFilters(asset, state)) filtered.push(asset)
	}
	return filtered
}
