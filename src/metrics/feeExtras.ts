export const FEE_EXTRA_DATA_TYPES_BY_SETTING = {
	bribes: 'dailyBribesRevenue',
	tokentax: 'dailyTokenTaxes'
} as const

export const FEE_EXTRA_METRIC_LABEL = {
	dailyBribesRevenue: 'Bribes Revenue',
	dailyTokenTaxes: 'Token Tax'
} as const

const FEE_EXTRA_ELIGIBLE_DATA_TYPES = new Set<string>([
	'dailyFees',
	'dailyRevenue',
	'dailyHoldersRevenue',
	'dailyAppFees',
	'dailyAppRevenue',
	'dailyEarnings'
])

const FEE_TOTAL_KEYS = ['total24h', 'total7d', 'total30d', 'total1y', 'totalAllTime'] as const

export type FeeExtraMetric = keyof typeof FEE_EXTRA_METRIC_LABEL
export type FeeExtraSettings = Partial<Record<keyof typeof FEE_EXTRA_DATA_TYPES_BY_SETTING, boolean>>
export type FeeExtraTotals = Partial<Record<(typeof FEE_TOTAL_KEYS)[number], number | null>>
export type RowWithFeeExtras = FeeExtraTotals & {
	bribes?: FeeExtraTotals | null
	tokenTax?: FeeExtraTotals | null
}

export function hasEnabledFeeExtras(settings: FeeExtraSettings) {
	return !!(settings.bribes || settings.tokentax)
}

export function hasAnyFeeExtraTotals(totals: FeeExtraTotals | null | undefined) {
	if (!totals) return false
	for (const key of FEE_TOTAL_KEYS) {
		const value = totals[key]
		if (value != null && value !== 0) return true
	}
	return false
}

export function getEnabledFeeExtraDataTypes(settings: FeeExtraSettings): FeeExtraMetric[] {
	const extras: FeeExtraMetric[] = []
	if (settings.bribes) extras.push(FEE_EXTRA_DATA_TYPES_BY_SETTING.bribes)
	if (settings.tokentax) extras.push(FEE_EXTRA_DATA_TYPES_BY_SETTING.tokentax)
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

export function getFeeExtraTotal(row: RowWithFeeExtras, key: keyof FeeExtraTotals, settings: FeeExtraSettings) {
	return (settings.bribes ? (row.bribes?.[key] ?? 0) : 0) + (settings.tokentax ? (row.tokenTax?.[key] ?? 0) : 0)
}

export function addFeeExtrasToRowTotals<T extends RowWithFeeExtras>(row: T, settings: FeeExtraSettings): T {
	if (!hasEnabledFeeExtras(settings)) return row

	const next = { ...row }
	for (const key of FEE_TOTAL_KEYS) {
		next[key] = addOptionalFeeExtraTotal(row[key], getFeeExtraTotal(row, key, settings))
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
