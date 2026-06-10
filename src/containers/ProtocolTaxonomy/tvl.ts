import { TVL_SETTINGS_KEYS } from '~/contexts/LocalStorage'
import { getPercentChange } from '~/utils'
import { categoriesPageExcludedExtraTvls } from './constants'
import type { IProtocolTaxonomyPageData, IProtocolsCategoriesPageData, IProtocolsCategoriesTableRow } from './types'

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
		let extraSum = 0
		if (timestampKey != null) {
			for (const extraTvlKey of enabledTvls) {
				extraSum += extraTvlCharts[extraTvlKey]?.[timestampKey] ?? 0
			}
		}

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
	let tvl = protocol.tvl
	for (const extraTvlKey of enabledTvls) {
		if (protocol.extraTvls[extraTvlKey] == null) continue
		tvl = (tvl ?? 0) + (protocol.extraTvls[extraTvlKey] ?? 0)
	}

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
			let extraTvlValue = 0
			for (const extraTvlKey of enabledTvls) {
				extraTvlValue += extraTvlCharts[categoryName]?.[extraTvlKey]?.[row.timestamp] ?? 0
			}

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
	let tvl = row.tvl
	let tvlPrevDay = row.tvlPrevDay
	let tvlPrevWeek = row.tvlPrevWeek
	let tvlPrevMonth = row.tvlPrevMonth

	for (const extraTvlKey of enabledTvls) {
		const extraTvl = row.extraTvls[extraTvlKey]
		if (extraTvl == null) continue
		tvl += extraTvl.tvl
		tvlPrevDay += extraTvl.tvlPrevDay
		tvlPrevWeek += extraTvl.tvlPrevWeek
		tvlPrevMonth += extraTvl.tvlPrevMonth
	}

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
