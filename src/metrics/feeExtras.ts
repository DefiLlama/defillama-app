export const FEE_EXTRA_DATA_TYPES_BY_SETTING = {
	bribes: 'dailyBribesRevenue',
	tokentax: 'dailyTokenTaxes'
} as const

export const FEE_EXTRA_QUERY_PARAMS_BY_SETTING = {
	bribes: 'include_bribes_in_fees',
	tokentax: 'include_tokentax_in_fees'
} as const

export const FEE_EXTRA_METRIC_LABEL = {
	dailyBribesRevenue: 'Bribes Revenue',
	dailyTokenTaxes: 'Token Tax'
} as const

export const FEE_EXTRA_TOTAL_FIELD_BY_SETTING = {
	bribes: 'bribes',
	tokentax: 'tokenTax'
} as const

export const FEE_EXTRA_PROTOCOL_METADATA_FIELD_BY_SETTING = {
	bribes: 'bribeRevenue',
	tokentax: 'tokenTax'
} as const

export const FEE_EXTRA_PROTOCOL_METRIC_FIELD_BY_SETTING = {
	bribes: 'bribes',
	tokentax: 'tokenTax'
} as const

export const FEE_EXTRA_METHODOLOGY_KEY_BY_SETTING = {
	bribes: 'BribesRevenue',
	tokentax: 'TokenTaxes'
} as const

export const FEE_EXTRA_CLIENT_QUERY_KEY_BY_SETTING = {
	bribes: 'bribes',
	tokentax: 'token-taxes'
} as const

export const FEE_EXTRA_CONFIG_BY_SETTING = {
	bribes: {
		setting: 'bribes',
		dataType: FEE_EXTRA_DATA_TYPES_BY_SETTING.bribes,
		queryParam: FEE_EXTRA_QUERY_PARAMS_BY_SETTING.bribes,
		label: FEE_EXTRA_METRIC_LABEL.dailyBribesRevenue,
		totalField: FEE_EXTRA_TOTAL_FIELD_BY_SETTING.bribes,
		protocolMetadataField: FEE_EXTRA_PROTOCOL_METADATA_FIELD_BY_SETTING.bribes,
		protocolMetricField: FEE_EXTRA_PROTOCOL_METRIC_FIELD_BY_SETTING.bribes,
		methodologyKey: FEE_EXTRA_METHODOLOGY_KEY_BY_SETTING.bribes,
		clientQueryKey: FEE_EXTRA_CLIENT_QUERY_KEY_BY_SETTING.bribes
	},
	tokentax: {
		setting: 'tokentax',
		dataType: FEE_EXTRA_DATA_TYPES_BY_SETTING.tokentax,
		queryParam: FEE_EXTRA_QUERY_PARAMS_BY_SETTING.tokentax,
		label: FEE_EXTRA_METRIC_LABEL.dailyTokenTaxes,
		totalField: FEE_EXTRA_TOTAL_FIELD_BY_SETTING.tokentax,
		protocolMetadataField: FEE_EXTRA_PROTOCOL_METADATA_FIELD_BY_SETTING.tokentax,
		protocolMetricField: FEE_EXTRA_PROTOCOL_METRIC_FIELD_BY_SETTING.tokentax,
		methodologyKey: FEE_EXTRA_METHODOLOGY_KEY_BY_SETTING.tokentax,
		clientQueryKey: FEE_EXTRA_CLIENT_QUERY_KEY_BY_SETTING.tokentax
	}
} as const

export const FEE_EXTRA_CONFIGS = [FEE_EXTRA_CONFIG_BY_SETTING.bribes, FEE_EXTRA_CONFIG_BY_SETTING.tokentax] as const

const FEE_EXTRA_ELIGIBLE_DATA_TYPES = new Set<string>([
	'dailyFees',
	'dailyRevenue',
	'dailyHoldersRevenue',
	'dailyAppFees',
	'dailyAppRevenue',
	'dailyEarnings'
])

export const FEE_EXTRA_TOTAL_KEYS = ['total24h', 'total7d', 'total30d', 'total1y', 'totalAllTime'] as const
export const FEE_EXTRA_PERIOD_TOTAL_KEYS = [
	'total24h',
	'total48hto24h',
	'total7d',
	'total14dto7d',
	'total30d',
	'total60dto30d',
	'total7DaysAgo',
	'total30DaysAgo',
	'total1y',
	'totalAllTime'
] as const

export type FeeExtraSetting = keyof typeof FEE_EXTRA_DATA_TYPES_BY_SETTING
export type FeeExtraMetric = keyof typeof FEE_EXTRA_METRIC_LABEL
export type FeeExtraConfig = (typeof FEE_EXTRA_CONFIGS)[number]
export type FeeExtraSettings = Partial<Record<FeeExtraSetting, boolean>>
export type FeeExtraTotals = Partial<Record<(typeof FEE_EXTRA_TOTAL_KEYS)[number], number | null>>
export type FeeExtraPeriodTotals = Partial<Record<(typeof FEE_EXTRA_PERIOD_TOTAL_KEYS)[number], number | null>>
type FeeExtraChanges = {
	change_1d?: number | null
	change_7d?: number | null
	change_1m?: number | null
	change_7dover7d?: number | null
	change_30dover30d?: number | null
}
export type RowWithFeeExtras = FeeExtraPeriodTotals &
	FeeExtraChanges & {
		bribes?: FeeExtraPeriodTotals | null
		tokenTax?: FeeExtraPeriodTotals | null
	}

function getPercentChange(valueNow: number | null | undefined, valuePrevious: number | null | undefined) {
	if (valueNow == null || valuePrevious == null || valuePrevious === 0) return null

	return ((valueNow - valuePrevious) / valuePrevious) * 100
}

function hasEnabledFeeExtraPeriodTotals(row: RowWithFeeExtras, settings: FeeExtraSettings) {
	for (const key of FEE_EXTRA_PERIOD_TOTAL_KEYS) {
		if (settings.bribes && row.bribes?.[key] != null) return true
		if (settings.tokentax && row.tokenTax?.[key] != null) return true
	}
	return false
}

function deriveFeeExtraChanges<T extends RowWithFeeExtras>(row: T): T {
	row.change_1d = getPercentChange(row.total24h, row.total48hto24h)
	row.change_7d = getPercentChange(row.total24h, row.total7DaysAgo)
	row.change_1m = getPercentChange(row.total24h, row.total30DaysAgo)
	row.change_7dover7d = getPercentChange(row.total7d, row.total14dto7d)
	row.change_30dover30d = getPercentChange(row.total30d, row.total60dto30d)

	return row
}

export function hasEnabledFeeExtras(settings: FeeExtraSettings) {
	return !!(settings.bribes || settings.tokentax)
}

export function getEnabledFeeExtraConfigs(settings: FeeExtraSettings): FeeExtraConfig[] {
	const extras: FeeExtraConfig[] = []
	for (const extra of FEE_EXTRA_CONFIGS) {
		if (settings[extra.setting]) extras.push(extra)
	}
	return extras
}

export function hasAnyFeeExtraTotals(totals: FeeExtraTotals | null | undefined) {
	if (!totals) return false
	for (const key of FEE_EXTRA_TOTAL_KEYS) {
		const value = totals[key]
		if (value != null && value !== 0) return true
	}
	return false
}

export function getEnabledFeeExtraDataTypes(settings: FeeExtraSettings): FeeExtraMetric[] {
	const extras: FeeExtraMetric[] = []
	for (const extra of getEnabledFeeExtraConfigs(settings)) {
		extras.push(extra.dataType)
	}
	return extras
}

export function isFeeExtraEligibleAdapterMetric({
	adapterType,
	dataType
}: {
	adapterType: string
	dataType: string | null | undefined
}) {
	if (adapterType !== 'fees') return false
	return dataType == null || FEE_EXTRA_ELIGIBLE_DATA_TYPES.has(dataType)
}

export function addOptionalFeeExtraTotal(base: number | null | undefined, extra: number) {
	return base != null ? base + extra : extra !== 0 ? extra : null
}

export function getFeeExtraTotal(row: RowWithFeeExtras, key: keyof FeeExtraPeriodTotals, settings: FeeExtraSettings) {
	return (settings.bribes ? (row.bribes?.[key] ?? 0) : 0) + (settings.tokentax ? (row.tokenTax?.[key] ?? 0) : 0)
}

export function addFeeExtrasToRowTotals<T extends RowWithFeeExtras>(row: T, settings: FeeExtraSettings): T {
	if (!hasEnabledFeeExtras(settings)) return row

	const next = { ...row }
	for (const key of FEE_EXTRA_PERIOD_TOTAL_KEYS) {
		next[key] = addOptionalFeeExtraTotal(row[key], getFeeExtraTotal(row, key, settings))
	}

	if (hasEnabledFeeExtraPeriodTotals(row, settings)) {
		return deriveFeeExtraChanges(next)
	}

	return next
}

export function mergeFeeExtraSeries({
	base,
	extraCharts
}: {
	base: Array<[number, number]>
	extraCharts: Array<Array<[number, number]>>
}) {
	if (extraCharts.every((chart) => chart.length === 0)) return base

	const rows = new Map<number, number | null>()

	for (const [timestamp, value] of base) {
		rows.set(timestamp, value)
	}

	for (const extraChart of extraCharts) {
		for (const [timestamp, value] of extraChart) {
			rows.set(timestamp, (rows.get(timestamp) ?? 0) + value)
		}
	}

	return Array.from(rows.entries()).sort((a, b) => a[0] - b[0]) as Array<[number, number]>
}
