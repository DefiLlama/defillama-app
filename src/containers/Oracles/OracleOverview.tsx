import type { ColumnDef } from '@tanstack/react-table'
import { lazy, Suspense, useMemo } from 'react'
import { BasicLink } from '~/components/Link'
import { LoadingDots } from '~/components/Loaders'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { CHART_COLORS } from '~/constants/colors'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formattedNum, getTokenDominance, slug, tokenIconUrl } from '~/utils'
import { useOracleOverviewExtraSeries } from './queries.client'
import { calculateTvsWithExtraToggles } from './tvl'
import type { OracleOverviewPageData, OracleProtocolWithBreakdown } from './types'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

interface IProtocolDominanceData {
	name: string
	tvs: number
}

interface IProtocolTableRow {
	name: string
	category: string
	tvl: number
}

const DEFAULT_PROTOCOL_TABLE_SORTING_STATE = [{ id: 'tvl', desc: true }]

const protocolColumns: ColumnDef<IProtocolTableRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			const name = getValue<string>()
			return (
				<span className="flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />

					<TokenLogo logo={tokenIconUrl(name)} data-lgonly />

					<BasicLink
						href={`/protocol/${slug(name)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
					>
						{name}
					</BasicLink>
				</span>
			)
		}
	},
	{
		header: 'Category',
		accessorKey: 'category',
		enableSorting: false,
		meta: {
			align: 'center'
		}
	},
	{
		header: 'TVL',
		accessorKey: 'tvl',
		enableSorting: true,
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: {
			align: 'center'
		}
	}
]

function getProtocolTvs({
	protocol,
	extraTvlsEnabled
}: {
	protocol: OracleProtocolWithBreakdown
	extraTvlsEnabled: Record<string, boolean>
}): number {
	let tvs = protocol.tvl

	for (const [extraName, values] of Object.entries(protocol.extraTvl ?? {})) {
		const normalizedName = extraName.toLowerCase()
		if (extraTvlsEnabled[normalizedName] && normalizedName !== 'doublecounted' && normalizedName !== 'liquidstaking') {
			tvs += values.tvl
		}
	}

	return tvs
}

export const OracleOverview = ({
	chartData,
	chainLinks,
	oracle,
	tvl,
	extraTvl,
	protocolTableData,
	chain = null
}: OracleOverviewPageData) => {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')
	const enabledExtraApiKeys = useMemo(() => {
		const apiKeys: Array<string> = []
		for (const [key, isEnabled] of Object.entries(extraTvlsEnabled)) {
			if (!isEnabled || key.toLowerCase() === 'tvl') continue
			apiKeys.push(key)
		}
		return apiKeys.toSorted((a, b) => a.localeCompare(b))
	}, [extraTvlsEnabled])

	const { isFetchingExtraSeries, extraTvsByTimestamp } = useOracleOverviewExtraSeries({
		enabledExtraApiKeys,
		oracle,
		chain
	})

	const tableData = useMemo<Array<IProtocolTableRow>>(() => {
		if (enabledExtraApiKeys.length === 0) {
			return protocolTableData
				.map((protocol) => ({
					name: protocol.name,
					category: protocol.category ?? 'Unknown',
					tvl: protocol.tvl
				}))
				.toSorted((a, b) => b.tvl - a.tvl)
		}

		return protocolTableData
			.map((protocol) => {
				const extraTvlValues: Record<string, number> = {}
				for (const [key, value] of Object.entries(protocol.extraTvl ?? {})) {
					extraTvlValues[key] = value.tvl
				}

				const tvl = calculateTvsWithExtraToggles({
					values: { tvl: protocol.tvl, ...extraTvlValues },
					extraTvlsEnabled
				})

				return {
					name: protocol.name,
					category: protocol.category ?? 'Unknown',
					tvl
				}
			})
			.toSorted((a, b) => b.tvl - a.tvl)
	}, [enabledExtraApiKeys.length, extraTvlsEnabled, protocolTableData])

	const { protocolsData, totalValue } = useMemo(() => {
		const protocolsData: Array<IProtocolDominanceData> = []
		for (const protocol of protocolTableData) {
			protocolsData.push({
				name: protocol.name,
				tvs: getProtocolTvs({ protocol, extraTvlsEnabled })
			})
		}
		protocolsData.sort((a, b) => b.tvs - a.tvs)

		const totalValue =
			enabledExtraApiKeys.length > 0
				? calculateTvsWithExtraToggles({
						values: { tvl, ...extraTvl },
						extraTvlsEnabled
					})
				: tvl

		return {
			protocolsData,
			totalValue
		}
	}, [enabledExtraApiKeys.length, extraTvl, extraTvlsEnabled, protocolTableData, tvl])

	const { dataset, charts } = useMemo(() => {
		const chartBreakdownByTimestamp = chartData
		const selectedOracle =
			oracle ?? Object.keys(chartBreakdownByTimestamp[0] ?? {}).find((key) => key !== 'timestamp') ?? ''
		const shouldApplyExtraSeries = enabledExtraApiKeys.length > 0 && !isFetchingExtraSeries

		const datasetSource: Array<{ timestamp: number; TVS: number }> = []

		for (const point of chartBreakdownByTimestamp) {
			const timestampInSeconds = point.timestamp
			if (!Number.isFinite(timestampInSeconds)) {
				continue
			}

			const baseTvs = selectedOracle ? (point[selectedOracle] ?? 0) : 0
			const extraTvs = shouldApplyExtraSeries ? (extraTvsByTimestamp.get(timestampInSeconds) ?? 0) : 0
			const tvsValue = baseTvs + extraTvs

			if (!Number.isFinite(tvsValue)) continue

			datasetSource.push({
				timestamp: timestampInSeconds * 1e3,
				TVS: tvsValue
			})
		}
		return {
			dataset: {
				source: datasetSource,
				dimensions: ['timestamp', 'TVS']
			},
			charts: [
				{
					type: 'line' as const,
					name: 'TVS',
					encode: { x: 'timestamp', y: 'TVS' },
					color: CHART_COLORS[0],
					stack: 'TVS'
				}
			]
		}
	}, [
		chartData,
		enabledExtraApiKeys.length,
		extraTvsByTimestamp,
		isFetchingExtraSeries,
		oracle
	])

	const topProtocol = protocolsData[0] ?? null
	const dominance = topProtocol ? getTokenDominance({ tvl: topProtocol.tvs }, totalValue) : null
	const dominanceText = dominance == null ? null : String(dominance)
	const displayOracle = oracle ?? 'Oracle'
	const dominanceLabel = topProtocol ? `${topProtocol.name} Dominance` : 'Top Protocol Dominance'

	return (
		<>
			<RowLinksWithDropdown links={chainLinks} activeLink={chain ?? 'All'} />

			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<h1 className="text-xl font-semibold">{displayOracle}</h1>
					<p className="flex flex-col">
						<span className="text-(--text-label)">Total Value Secured (USD)</span>
						<span className="font-jetbrains text-2xl font-semibold">{formattedNum(totalValue, true)}</span>
					</p>
					<p className="flex flex-col">
						<span className="text-(--text-label)">{dominanceLabel}</span>
						<span className="font-jetbrains text-2xl font-semibold">
							{dominanceText === null ? 'N/A' : `${dominanceText}%`}
						</span>
					</p>
				</div>

				<div className="col-span-2 rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
					{isFetchingExtraSeries ? (
						<p className="my-auto flex min-h-[398px] items-center justify-center gap-1 text-center text-xs">
							Loading
							<LoadingDots />
						</p>
					) : (
						<Suspense fallback={<div className="min-h-[398px]" />}>
							<MultiSeriesChart2
								dataset={dataset}
								charts={charts}
								alwaysShowTooltip
								exportButtons={{ png: true, csv: true }}
							/>
						</Suspense>
					)}
				</div>
			</div>

			<Suspense
				fallback={
					<div
						style={{ minHeight: `${tableData.length * 50 + 200}px` }}
						className="rounded-md border border-(--cards-border) bg-(--cards-bg)"
					/>
				}
			>
				<TableWithSearch
					data={tableData}
					columns={protocolColumns}
					columnToSearch="name"
					placeholder="Search protocols..."
					header="Protocols"
					sortingState={DEFAULT_PROTOCOL_TABLE_SORTING_STATE}
					compact
				/>
			</Suspense>
		</>
	)
}
