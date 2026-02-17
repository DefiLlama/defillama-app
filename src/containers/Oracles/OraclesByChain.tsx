import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import * as React from 'react'
import { preparePieChartData } from '~/components/ECharts/formatters'
import { IconsRow } from '~/components/IconsRow'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formattedNum, slug } from '~/utils'
import { fetchOracleChainProtocolBreakdownChart, fetchOracleProtocolBreakdownChart } from './api'
import { calculateTvsWithExtraToggles } from './tvl'
import type { OracleBreakdownItem, OracleChainPageData, OracleChartData } from './types'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart'))
const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const DEFAULT_SORTING_STATE = [{ id: 'tvs', desc: true }]

type IOraclesByChainProps = Pick<
	OracleChainPageData,
	'chartData' | 'oracleProtocolsCount' | 'oracles' | 'oracleLinks' | 'oraclesColors' | 'chainsByOracle' | 'chain'
>

interface IOracleTableRowData {
	name: string
	protocolsSecured: number
	tvs: number
}

interface IOracleDominanceChart {
	type: 'line'
	name: string
	encode: { x: string; y: string }
	color: string
	stack: string
}

function mergeExtraChartData({
	baseChartData,
	extraBreakdownsByApiKey
}: {
	baseChartData: OracleChartData
	extraBreakdownsByApiKey: Record<string, Array<OracleBreakdownItem>>
}): OracleChartData {
	const mergedByTimestamp = new Map<number, Record<string, Record<string, number>>>()

	for (const [timestamp, valuesByOracle] of baseChartData) {
		const copiedValuesByOracle: Record<string, Record<string, number>> = {}
		for (const [oracleName, values] of Object.entries(valuesByOracle)) {
			copiedValuesByOracle[oracleName] = { ...values }
		}
		mergedByTimestamp.set(timestamp, copiedValuesByOracle)
	}

	for (const [apiKey, chart] of Object.entries(extraBreakdownsByApiKey)) {
		const metricName = apiKey
		if (!metricName || metricName === 'tvl') continue

		for (const dayData of chart) {
			const timestamp = dayData.timestamp
			const valuesByOracle = mergedByTimestamp.get(timestamp) ?? {}

			for (const [oracleName, value] of Object.entries(dayData)) {
				if (oracleName === 'timestamp') continue
				const currentValues = valuesByOracle[oracleName] ?? { tvl: 0 }
				currentValues[metricName] = value
				valuesByOracle[oracleName] = currentValues
			}

			mergedByTimestamp.set(timestamp, valuesByOracle)
		}
	}

	return Array.from(mergedByTimestamp.entries()).toSorted((a, b) => a[0] - b[0])
}

export const OraclesByChain = ({
	chartData,
	oracleProtocolsCount,
	oracles,
	oracleLinks,
	oraclesColors,
	chainsByOracle,
	chain
}: IOraclesByChainProps) => {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	const enabledExtraApiKeys = React.useMemo(() => {
		const apiKeys = new Set<string>()
		for (const [settingKey, enabled] of Object.entries(extraTvlsEnabled)) {
			if (!enabled) continue
			apiKeys.add(settingKey)
		}
		return Array.from(apiKeys).toSorted((a, b) => a.localeCompare(b))
	}, [extraTvlsEnabled])

	const { data: extraBreakdownsByApiKey = {}, isFetching: isFetchingExtraBreakdowns } = useQuery<
		Record<string, Array<OracleBreakdownItem>>
	>({
		queryKey: ['oracles', 'extra-breakdown', chain ?? 'all', enabledExtraApiKeys.join(',')],
		queryFn: async () => {
			const entries = await Promise.all(
				enabledExtraApiKeys.map(async (apiKey) => {
					const chart = chain
						? await fetchOracleChainProtocolBreakdownChart({ chain, key: apiKey })
						: await fetchOracleProtocolBreakdownChart({ key: apiKey })
					return [apiKey, chart] as const
				})
			)

			const result: Record<string, Array<OracleBreakdownItem>> = {}
			for (const [apiKey, chart] of entries) {
				result[apiKey] = chart
			}
			return result
		},
		enabled: enabledExtraApiKeys.length > 0,
		staleTime: 5 * 60 * 1_000,
		refetchOnWindowFocus: false
	})

	const shouldApplyExtraTvlFormatting = enabledExtraApiKeys.length > 0 && !isFetchingExtraBreakdowns

	const effectiveChartData = React.useMemo(() => {
		if (!shouldApplyExtraTvlFormatting) return chartData
		return mergeExtraChartData({
			baseChartData: chartData,
			extraBreakdownsByApiKey
		})
	}, [chartData, extraBreakdownsByApiKey, shouldApplyExtraTvlFormatting])

	const effectiveData = React.useMemo(() => {
		const latestValues = effectiveChartData[effectiveChartData.length - 1]?.[1] ?? {}
		const tableData = oracles
			.map((oracleName) => ({
				name: oracleName,
				protocolsSecured: oracleProtocolsCount[oracleName] ?? 0,
				tvs: shouldApplyExtraTvlFormatting
					? calculateTvsWithExtraToggles({
							values: latestValues[oracleName] ?? { tvl: 0 },
							extraTvlsEnabled
						})
					: (latestValues[oracleName]?.tvl ?? 0)
			}))
			.toSorted((a, b) => b.tvs - a.tvs)
		const pieChartData = tableData.map((row) => ({ name: row.name, value: row.tvs }))
		const dimensions = ['timestamp', ...oracles]
		const source: Array<Record<string, number>> = []

		for (const [timestampInSeconds, valuesByOracle] of effectiveChartData) {
			let dayTotal = 0
			const valuesWithExtraTvls: Record<string, number> = {}
			for (const oracleName of oracles) {
				const oracleTvs = shouldApplyExtraTvlFormatting
					? calculateTvsWithExtraToggles({
							values: valuesByOracle[oracleName] ?? { tvl: 0 },
							extraTvlsEnabled
						})
					: (valuesByOracle[oracleName]?.tvl ?? 0)
				valuesWithExtraTvls[oracleName] = oracleTvs
				dayTotal += oracleTvs
			}

			if (dayTotal === 0) continue

			const point: Record<string, number> = { timestamp: timestampInSeconds * 1e3 }
			for (const oracleName of oracles) {
				point[oracleName] = (valuesWithExtraTvls[oracleName] / dayTotal) * 100
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
			tableData,
			pieChartData,
			dominanceCharts,
			dominanceDataset: { source, dimensions }
		}
	}, [
		effectiveChartData,
		extraTvlsEnabled,
		oracleProtocolsCount,
		oracles,
		shouldApplyExtraTvlFormatting,
		oraclesColors
	])

	// Merge chains data into table rows
	const tableDataWithChains = React.useMemo(() => {
		return effectiveData.tableData.map((row) => ({
			...row,
			chains: chainsByOracle[row.name] ?? [],
			chainsCount: (chainsByOracle[row.name] ?? []).length
		}))
	}, [effectiveData.tableData, chainsByOracle])

	// Prepare pie chart data with colors
	const pieData = React.useMemo(() => {
		return preparePieChartData({
			data: effectiveData.pieChartData,
			limit: 5
		})
	}, [effectiveData.pieChartData])

	const activeLink = chain ?? 'All'

	return (
		<>
			<RowLinksWithDropdown links={oracleLinks} activeLink={activeLink} />

			<div className="flex flex-col gap-2 xl:flex-row">
				<div className="relative isolate flex flex-1 flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<React.Suspense fallback={<div className="min-h-[398px]" />}>
						<PieChart
							chartData={pieData}
							stackColors={oraclesColors}
							exportButtons={{ png: true, csv: true, filename: 'oracles-tvs-pie', pngTitle: 'Oracles TVS' }}
						/>
					</React.Suspense>
				</div>
				<div className="flex-1 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<React.Suspense fallback={<div className="min-h-[398px]" />}>
						<MultiSeriesChart2
							dataset={effectiveData.dominanceDataset}
							charts={effectiveData.dominanceCharts}
							stacked={true}
							expandTo100Percent={true}
							hideDefaultLegend
							valueSymbol="%"
						/>
					</React.Suspense>
				</div>
			</div>

			<React.Suspense
				fallback={
					<div
						style={{ minHeight: `${tableDataWithChains.length * 50 + 200}px` }}
						className="rounded-md border border-(--cards-border) bg-(--cards-bg)"
					/>
				}
			>
				<TableWithSearch
					data={tableDataWithChains}
					columns={columns}
					columnToSearch="name"
					placeholder="Search oracles..."
					header="Oracle Rankings"
					sortingState={DEFAULT_SORTING_STATE}
				/>
			</React.Suspense>
		</>
	)
}

type IOracleTableRow = IOracleTableRowData & { chains: string[]; chainsCount: number }

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
		accessorKey: 'tvs',
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
