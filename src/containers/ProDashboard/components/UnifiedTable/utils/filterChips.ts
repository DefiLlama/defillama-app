import type { TableFilters } from '~/containers/ProDashboard/types'
import { formattedNum } from '~/utils'

export interface ActiveFilterChip {
	id: string
	label: string
	value?: string
	clearKeys: (keyof TableFilters)[]
}

const formatList = (values: string[]): string => {
	if (values.length <= 3) {
		return values.join(', ')
	}
	const remaining = values.length - 3
	return `${values.slice(0, 3).join(', ')} +${remaining}`
}

const formatCurrency = (value: number) => formattedNum(value, true)
const formatNumber = (value: number) => formattedNum(value)
const formatPercent = (value: number) => `${formattedNum(value)}%`

const addRangeChip = (
	chips: ActiveFilterChip[],
	filters: TableFilters,
	minKey: keyof TableFilters,
	maxKey: keyof TableFilters,
	label: string,
	formatter: (value: number) => string
) => {
	const minValue = filters[minKey] as number | undefined
	const maxValue = filters[maxKey] as number | undefined
	const hasMin = typeof minValue === 'number'
	const hasMax = typeof maxValue === 'number'
	if (!hasMin && !hasMax) {
		return
	}
	let value: string
	if (hasMin && hasMax) {
		value = `${formatter(minValue!)} - ${formatter(maxValue!)}`
	} else if (hasMin) {
		value = `≥ ${formatter(minValue!)}`
	} else {
		value = `≤ ${formatter(maxValue!)}`
	}
	chips.push({
		id: `${String(minKey)}-${String(maxKey)}`,
		label,
		value,
		clearKeys: [minKey, maxKey]
	})
}

const addListChip = (
	chips: ActiveFilterChip[],
	filters: TableFilters,
	key: keyof TableFilters,
	label: string
) => {
	const values = filters[key]
	if (!Array.isArray(values) || !values.length) {
		return
	}
	chips.push({
		id: String(key),
		label,
		value: formatList(values as string[]),
		clearKeys: [key]
	})
}

const addBooleanChip = (
	chips: ActiveFilterChip[],
	filters: TableFilters,
	key: keyof TableFilters,
	label: string
) => {
	if (!filters[key]) {
		return
	}
	chips.push({ id: String(key), label, clearKeys: [key] })
}

export const getActiveFilterChips = (filters?: TableFilters): ActiveFilterChip[] => {
	if (!filters) {
		return []
	}
	const chips: ActiveFilterChip[] = []
	const clones: TableFilters = { ...filters }

	addListChip(chips, clones, 'protocols', 'Protocols')
	addListChip(chips, clones, 'categories', 'Categories')
	addListChip(chips, clones, 'excludedCategories', 'Exclude Categories')
	addListChip(chips, clones, 'chains', 'Chains')
	addListChip(chips, clones, 'oracles', 'Oracles')
	addListChip(chips, clones, 'poolTypes', 'Pool Types')

	addRangeChip(chips, clones, 'tvlMin', 'tvlMax', 'TVL', formatCurrency)
	addRangeChip(chips, clones, 'mcapMin', 'mcapMax', 'Market Cap', formatCurrency)
	addRangeChip(chips, clones, 'volumeDex24hMin', 'volumeDex24hMax', '24h Volume', formatCurrency)
	addRangeChip(chips, clones, 'fees24hMin', 'fees24hMax', '24h Fees', formatCurrency)
	addRangeChip(chips, clones, 'revenue24hMin', 'revenue24hMax', '24h Revenue', formatCurrency)
	addRangeChip(chips, clones, 'apyMin', 'apyMax', 'APY', formatPercent)
	addRangeChip(chips, clones, 'baseApyMin', 'baseApyMax', 'Base APY', formatPercent)
	addRangeChip(chips, clones, 'pfRatioMin', 'pfRatioMax', 'P/F Ratio', formatNumber)
	addRangeChip(chips, clones, 'protocolCountMin', 'protocolCountMax', 'Protocol Count', formatNumber)

	addBooleanChip(chips, clones, 'multiChainOnly', 'Multi-chain only')
	addBooleanChip(chips, clones, 'parentProtocolsOnly', 'Parent protocols only')
	addBooleanChip(chips, clones, 'subProtocolsOnly', 'Sub-protocols only')
	addBooleanChip(chips, clones, 'stablesOnly', 'Stablecoin pools only')
	addBooleanChip(chips, clones, 'activeLending', 'Active lending pools')
	addBooleanChip(chips, clones, 'hasRewards', 'Rewards enabled')
	addBooleanChip(chips, clones, 'hasPerps', 'Perps only')
	addBooleanChip(chips, clones, 'hasOptions', 'Options only')
	addBooleanChip(chips, clones, 'hasOpenInterest', 'Has open interest')

	return chips
}
