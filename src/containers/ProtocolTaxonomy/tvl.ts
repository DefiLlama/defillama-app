import { TVL_SETTINGS_KEYS } from '~/contexts/LocalStorage'
import { getPercentChange } from '~/utils'
import { categoriesPageExcludedExtraTvls } from './constants'
import type {
	IProtocolTaxonomyPageData,
	IProtocolsCategoriesExtraTvlPoint,
	IProtocolsCategoriesPageData,
	IProtocolsCategoriesTableRow
} from './types'

type ProtocolTaxonomyProtocol = IProtocolTaxonomyPageData['protocols'][number]
type ProtocolsCategoriesChartState = {
	dataset: {
		source: IProtocolsCategoriesPageData['chartSource']
		dimensions: Array<string>
	}
	charts: Array<{
		type: 'line'
		name: string
		encode: { x: 'timestamp'; y: string }
		stack: 'stackA'
		color: string
	}>
}

function getEnabledExtraTvlValueSum(
	extraTvls: Record<string, number>,
	enabledTvls: Array<string>
): { sum: number; hasValue: boolean } {
	let extraSum = 0
	let hasValue = false
	for (const extraTvlKey of enabledTvls) {
		const extraTvl = extraTvls[extraTvlKey]
		if (extraTvl == null) continue
		extraSum += extraTvl
		hasValue = true
	}
	return { sum: extraSum, hasValue }
}

function sumEnabledExtraTvlChartValues({
	extraTvlCharts,
	enabledTvls,
	timestamp
}: {
	extraTvlCharts: Record<string, Record<string | number, number | null | undefined> | undefined>
	enabledTvls: Array<string>
	timestamp: string | number
}): number {
	let extraSum = 0
	for (const extraTvlKey of enabledTvls) {
		extraSum += extraTvlCharts[extraTvlKey]?.[timestamp] ?? 0
	}
	return extraSum
}

function sumEnabledExtraTvlField({
	extraTvls,
	enabledTvls,
	field
}: {
	extraTvls: IProtocolsCategoriesTableRow['extraTvls']
	enabledTvls: Array<string>
	field: keyof IProtocolsCategoriesExtraTvlPoint
}): number {
	let extraSum = 0
	for (const extraTvlKey of enabledTvls) {
		extraSum += extraTvls[extraTvlKey]?.[field] ?? 0
	}
	return extraSum
}

export function getEnabledProtocolTaxonomyTvls(tvlSettings: Record<string, boolean>) {
	return TVL_SETTINGS_KEYS.filter((key) => tvlSettings[key])
}

export function getEnabledProtocolsCategoriesTvls(tvlSettings: Record<string, boolean>) {
	return TVL_SETTINGS_KEYS.filter((key) => tvlSettings[key] && !categoriesPageExcludedExtraTvls.has(key))
}

export function applyProtocolTaxonomyTvlSettings({
	protocols,
	charts,
	extraTvlCharts,
	tvlSettings,
	effectiveCategory
}: {
	protocols: IProtocolTaxonomyPageData['protocols']
	charts: IProtocolTaxonomyPageData['charts']
	extraTvlCharts: IProtocolTaxonomyPageData['extraTvlCharts']
	tvlSettings: Record<string, boolean>
	effectiveCategory: IProtocolTaxonomyPageData['effectiveCategory']
}): {
	finalProtocols: IProtocolTaxonomyPageData['protocols']
	charts: IProtocolTaxonomyPageData['charts']
} {
	const enabledTvls = getEnabledProtocolTaxonomyTvls(tvlSettings)

	if (enabledTvls.length === 0) return { finalProtocols: protocols, charts }

	const finalProtocols = protocols.map((protocol) => applyProtocolRowTvlSettings(protocol, enabledTvls))
	const shouldMirrorBorrowedChart = effectiveCategory === 'Lending' && enabledTvls.includes('borrowed')
	const finalSource: IProtocolTaxonomyPageData['charts']['dataset']['source'] = charts.dataset.source.map((row) => {
		const timestampKey = row.timestamp
		const extraSum =
			timestampKey == null ? 0 : sumEnabledExtraTvlChartValues({ extraTvlCharts, enabledTvls, timestamp: timestampKey })

		const currentTvlValue = typeof row.TVL === 'number' ? row.TVL : Number(row.TVL ?? 0)
		const safeCurrentTvlValue = Number.isFinite(currentTvlValue) ? currentTvlValue : 0
		const nextTvlValue = safeCurrentTvlValue + extraSum
		const timestamp = row.timestamp

		if (shouldMirrorBorrowedChart) {
			return { ...row, timestamp, TVL: nextTvlValue, 'Active Loans': nextTvlValue }
		}

		return { ...row, timestamp, TVL: nextTvlValue }
	})

	return {
		finalProtocols,
		charts: {
			...charts,
			dataset: { ...charts.dataset, source: finalSource }
		}
	}
}

function applyProtocolRowTvlSettings(
	protocol: ProtocolTaxonomyProtocol,
	enabledTvls: Array<string>
): ProtocolTaxonomyProtocol {
	const extraTvl = getEnabledExtraTvlValueSum(protocol.extraTvls, enabledTvls)
	const tvl = extraTvl.hasValue ? (protocol.tvl ?? 0) + extraTvl.sum : protocol.tvl

	const updated = { ...protocol, tvl }
	if (updated.subRows?.length > 0) {
		updated.subRows = updated.subRows.map((subRow) => applyProtocolRowTvlSettings(subRow, enabledTvls))
	}
	return updated
}

export function buildProtocolsCategoriesTvlCharts({
	categories,
	categoryColors,
	chartSource,
	extraTvlCharts,
	selectedCategories,
	enabledTvls
}: {
	categories: IProtocolsCategoriesPageData['categories']
	categoryColors: IProtocolsCategoriesPageData['categoryColors']
	chartSource: IProtocolsCategoriesPageData['chartSource']
	extraTvlCharts: IProtocolsCategoriesPageData['extraTvlCharts']
	selectedCategories: Array<string>
	enabledTvls: Array<string>
}): ProtocolsCategoriesChartState {
	const selectedCategoriesSet = new Set(selectedCategories)
	const filteredCategories = categories.filter((categoryName) => selectedCategoriesSet.has(categoryName))

	const source: IProtocolsCategoriesPageData['chartSource'] = chartSource.map((row) => {
		if (enabledTvls.length === 0) return row

		const adjustedRow: IProtocolsCategoriesPageData['chartSource'][number] = {
			timestamp: row.timestamp
		}

		for (const categoryName of filteredCategories) {
			const baseValue = row[categoryName]
			const safeBaseValue = typeof baseValue === 'number' ? baseValue : 0
			const extraTvlValue = sumEnabledExtraTvlChartValues({
				extraTvlCharts: extraTvlCharts[categoryName] ?? {},
				enabledTvls,
				timestamp: row.timestamp
			})

			adjustedRow[categoryName] = safeBaseValue + extraTvlValue
		}

		return adjustedRow
	})

	const dimensions = ['timestamp', ...filteredCategories]
	const charts = filteredCategories.map((categoryName) => ({
		type: 'line' as const,
		name: categoryName,
		encode: { x: 'timestamp' as const, y: categoryName },
		stack: 'stackA' as const,
		color: categoryColors[categoryName]
	}))

	return { dataset: { source, dimensions }, charts }
}

export function applyProtocolsCategoriesTvlSettings({
	tableData,
	enabledTvls
}: {
	tableData: IProtocolsCategoriesPageData['tableData']
	enabledTvls: Array<string>
}): IProtocolsCategoriesPageData['tableData'] {
	if (enabledTvls.length === 0) return tableData

	return tableData.map((row) => applyProtocolsCategoriesRowTvlSettings(row, enabledTvls))
}

function applyProtocolsCategoriesRowTvlSettings(
	row: IProtocolsCategoriesTableRow,
	enabledTvls: Array<string>
): IProtocolsCategoriesTableRow {
	const tvl = row.tvl + sumEnabledExtraTvlField({ extraTvls: row.extraTvls, enabledTvls, field: 'tvl' })
	const tvlPrevDay =
		row.tvlPrevDay + sumEnabledExtraTvlField({ extraTvls: row.extraTvls, enabledTvls, field: 'tvlPrevDay' })
	const tvlPrevWeek =
		row.tvlPrevWeek + sumEnabledExtraTvlField({ extraTvls: row.extraTvls, enabledTvls, field: 'tvlPrevWeek' })
	const tvlPrevMonth =
		row.tvlPrevMonth + sumEnabledExtraTvlField({ extraTvls: row.extraTvls, enabledTvls, field: 'tvlPrevMonth' })

	const updatedRow: IProtocolsCategoriesTableRow = {
		...row,
		tvl,
		tvlPrevDay,
		tvlPrevWeek,
		tvlPrevMonth,
		change_1d: getPercentChange(tvl, tvlPrevDay),
		change_7d: getPercentChange(tvl, tvlPrevWeek),
		change_1m: getPercentChange(tvl, tvlPrevMonth)
	}

	if (row.subRows != null && row.subRows.length > 0) {
		updatedRow.subRows = row.subRows.map((subRow) => applyProtocolsCategoriesRowTvlSettings(subRow, enabledTvls))
	}

	return updatedRow
}
