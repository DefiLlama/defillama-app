import type { ColumnDef } from '@tanstack/react-table'
import * as React from 'react'
import { preparePieChartData } from '~/components/ECharts/formatters'
import { IconsRow } from '~/components/IconsRow'
import { BasicLink } from '~/components/Link'
import { LoadingDots } from '~/components/Loaders'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formattedNum, slug } from '~/utils'
import { useOraclesByChainExtraBreakdowns } from './queries.client'
import { calculateTvsWithExtraToggles, getEnabledExtraApiKeys } from './tvl'
import type { OracleBreakdownItem, OraclesByChainPageData } from './types'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart'))
const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const DEFAULT_SORTING_STATE = [{ id: 'tvl', desc: true }]

interface IOracleDominanceChart {
	type: 'line'
	name: string
	encode: { x: string; y: string }
	color: string
	stack: string
}

function indexExtraChartDataByTimestamp(extraBreakdownsByApiKey: Record<string, Array<OracleBreakdownItem>>) {
	const indexedByTimestamp = new Map<number, Record<string, Record<string, number>>>()
	for (const [apiKey, chart] of Object.entries(extraBreakdownsByApiKey)) {
		for (const dayData of chart) {
			const timestamp = dayData.timestamp
			const valuesByOracle = indexedByTimestamp.get(timestamp) ?? {}

			for (const [oracleName, value] of Object.entries(dayData)) {
				if (oracleName === 'timestamp') continue
				if (!Number.isFinite(value)) continue
				const currentValues = valuesByOracle[oracleName] ?? {}
				currentValues[apiKey] = value
				valuesByOracle[oracleName] = currentValues
			}

			indexedByTimestamp.set(timestamp, valuesByOracle)
		}
	}

	return indexedByTimestamp
}

export const OraclesByChain = ({
	chartData,
	tableData,
	oracles,
	chainLinks,
	oraclesColors,
	chain
}: OraclesByChainPageData) => {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	const enabledExtraApiKeys = React.useMemo(() => getEnabledExtraApiKeys(extraTvlsEnabled), [extraTvlsEnabled])
	const hasEnabledExtras = enabledExtraApiKeys.length > 0

	const { extraBreakdownsByApiKey, isFetchingExtraBreakdowns } = useOraclesByChainExtraBreakdowns({
		enabledExtraApiKeys,
		chain
	})

	const shouldApplyExtraTvlFormatting = hasEnabledExtras && !isFetchingExtraBreakdowns

	const tableAndPieData = React.useMemo(() => {
		if (!hasEnabledExtras) {
			const pieData = preparePieChartData({
				data: tableData.map((row) => ({ name: row.name, value: row.tvl })),
				limit: 5
			})

			return {
				tableData,
				pieData
			}
		}

		const tableDataWithAdjustedTvl = tableData
			.map((row) => ({
				...row,
				tvl: calculateTvsWithExtraToggles({
					values: { tvl: row.tvl, ...row.extraTvl },
					extraTvlsEnabled
				})
			}))
			.toSorted((a, b) => b.tvl - a.tvl)
		const pieData = preparePieChartData({
			data: tableDataWithAdjustedTvl.map((row) => ({ name: row.name, value: row.tvl })),
			limit: 5
		})

		return {
			tableData: tableDataWithAdjustedTvl,
			pieData
		}
	}, [extraTvlsEnabled, hasEnabledExtras, tableData])

	const dominanceData = React.useMemo(() => {
		const extraValuesByTimestamp = shouldApplyExtraTvlFormatting
			? indexExtraChartDataByTimestamp(extraBreakdownsByApiKey)
			: null
		const dimensions = ['timestamp', ...oracles]
		const source: Array<Record<string, number>> = []

		for (const baseDayData of chartData) {
			const timestampInSeconds = baseDayData.timestamp
			if (!Number.isFinite(timestampInSeconds)) continue
			const extraValuesForTimestamp = extraValuesByTimestamp?.get(timestampInSeconds) ?? {}

			let dayTotal = 0
			const perOracleValues: Array<[string, number]> = []
			for (const oracleName of oracles) {
				const oracleTvs = shouldApplyExtraTvlFormatting
					? calculateTvsWithExtraToggles({
							values: {
								tvl: baseDayData[oracleName] ?? 0,
								...(extraValuesForTimestamp[oracleName] ?? {})
							},
							extraTvlsEnabled
						})
					: (baseDayData[oracleName] ?? 0)
				perOracleValues.push([oracleName, oracleTvs])
				dayTotal += oracleTvs
			}

			if (dayTotal === 0) continue

			const point: Record<string, number> = { timestamp: timestampInSeconds * 1e3 }
			for (const [oracleName, oracleTvs] of perOracleValues) {
				point[oracleName] = (oracleTvs / dayTotal) * 100
			}
			source.push(point)
		}

		const dominanceCharts: Array<IOracleDominanceChart> = oracles.map((name) => ({
			type: 'line',
			name,
			encode: { x: 'timestamp', y: name },
			color: oraclesColors[name] ?? '#ccc',
			stack: 'dominance'
		}))

		return {
			dominanceCharts,
			dominanceDataset: { source, dimensions }
		}
	}, [chartData, extraBreakdownsByApiKey, extraTvlsEnabled, oracles, shouldApplyExtraTvlFormatting, oraclesColors])

	const activeLink = chain ?? 'All'

	return (
		<>
			<RowLinksWithDropdown links={chainLinks} activeLink={activeLink} />

			<div className="flex flex-col gap-2 xl:flex-row">
				<div className="relative isolate flex flex-1 flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<React.Suspense fallback={<div className="min-h-[398px]" />}>
						<PieChart
							chartData={tableAndPieData.pieData}
							stackColors={oraclesColors}
							exportButtons={{ png: true, csv: true, filename: 'oracles-tvs-pie', pngTitle: 'Oracles TVS' }}
						/>
					</React.Suspense>
				</div>
				<div className="flex-1 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					{isFetchingExtraBreakdowns ? (
						<p className="my-auto flex min-h-[398px] items-center justify-center gap-1 text-center text-xs">
							Loading
							<LoadingDots />
						</p>
					) : (
						<React.Suspense fallback={<div className="min-h-[398px]" />}>
							<MultiSeriesChart2
								dataset={dominanceData.dominanceDataset}
								charts={dominanceData.dominanceCharts}
								stacked={true}
								expandTo100Percent={true}
								hideDefaultLegend
								valueSymbol="%"
							/>
						</React.Suspense>
					)}
				</div>
			</div>

			<React.Suspense
				fallback={
					<div
						style={{ minHeight: `${tableAndPieData.tableData.length * 50 + 200}px` }}
						className="rounded-md border border-(--cards-border) bg-(--cards-bg)"
					/>
				}
			>
				<TableWithSearch
					data={tableAndPieData.tableData}
					columns={columns}
					columnToSearch="name"
					placeholder="Search oracles..."
					header="Oracle Rankings"
					csvFileName="oracle-rankings.csv"
					sortingState={DEFAULT_SORTING_STATE}
				/>
			</React.Suspense>
		</>
	)
}

type IOracleTableRow = OraclesByChainPageData['tableData'][number]

const columns: ColumnDef<IOracleTableRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			const name = getValue<string>()
			return (
				<span className="relative flex items-center gap-2">
					<BasicLink
						href={`/oracles/${slug(name)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
					>
						{name}
					</BasicLink>
				</span>
			)
		}
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		size: 200,
		cell: ({ row }) => {
			const chains = row.original.chains ?? []
			return (
				<div className="flex items-center justify-end gap-1 overflow-hidden">
					<IconsRow links={chains} url="/oracles/chain" iconType="chain" />
				</div>
			)
		},
		meta: {
			align: 'end',
			headerHelperText: 'Chains secured by the oracle'
		}
	},
	{
		header: 'Protocols',
		accessorKey: 'protocolsSecured',
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'TVS',
		accessorKey: 'tvl',
		enableSorting: true,
		size: 140,
		cell: ({ getValue }) => {
			const value = getValue<number>()
			return <span>{formattedNum(value, true)}</span>
		},
		meta: {
			align: 'end',
			headerHelperText: 'Total Value Secured by the Oracle'
		}
	}
]
