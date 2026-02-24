import type { ColumnDef } from '@tanstack/react-table'
import { lazy, startTransition, Suspense, useDeferredValue, useMemo, useState } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { formatBarChart, formatLineChart } from '~/components/ECharts/utils'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { QuestionHelper } from '~/components/QuestionHelper'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { TVL_SETTINGS_KEYS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { definitions } from '~/definitions'
import { chainIconUrl, formatNum, formattedNum, slug } from '~/utils'
import { getProtocolCategoryColumnBehavior, getProtocolCategoryPresentation } from './constants'
import type { IProtocolByCategoryOrTagPageData } from './types'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))
const CHART_INTERVALS_LIST = ['daily', 'weekly', 'monthly', 'cumulative'] as const
type ChartInterval = (typeof CHART_INTERVALS_LIST)[number]

const defaultSortingState: Partial<Record<string, { id: string; desc: boolean }[]>> = {
	'Trading App': [{ id: 'revenue_7d', desc: true }],
	Derivatives: [{ id: 'perp_volume_24h', desc: true }],
	Interface: [{ id: 'perp_volume_24h', desc: true }],
	Options: [{ id: 'options_premium_7d', desc: true }],
	'Telegram Bot': [{ id: 'revenue_7d', desc: true }],
	'NFT Marketplace': [{ id: 'revenue_7d', desc: true }],
	SoFi: [{ id: 'revenue_7d', desc: true }],
	Launchpad: [{ id: 'revenue_7d', desc: true }],
	'NFT Launchpad': [{ id: 'revenue_7d', desc: true }],
	Services: [{ id: 'revenue_7d', desc: true }],
	'Developer Tools': [{ id: 'revenue_7d', desc: true }],
	Dexs: [{ id: 'dex_volume_7d', desc: true }],
	'DEX Aggregator': [{ id: 'dex_aggregator_volume_7d', desc: true }],
	'Prediction Market': [{ id: 'prediction_market_volume_7d', desc: true }],
	Wallets: [{ id: 'revenue_7d', desc: true }],
	'Stablecoin Issuer': [{ id: 'revenue_7d', desc: true }],
	Domains: [{ id: 'revenue_7d', desc: true }]
}

export function ProtocolsByCategoryOrTag(props: IProtocolByCategoryOrTagPageData) {
	const name = props.category ?? props.tag ?? ''
	const namePrefix = name ? `${name}-` : ''
	const [groupBy, setGroupBy] = useState<ChartInterval>('daily')
	const { chartInstance, handleChartReady } = useGetChartInstance()
	const categoryPresentation = useMemo(
		() =>
			getProtocolCategoryPresentation({
				label: name,
				effectiveCategory: props.effectiveCategory,
				isTagPage: !!props.tag && !props.category
			}),
		[name, props.effectiveCategory, props.tag, props.category]
	)

	const [tvlSettings] = useLocalStorageSettingsManager('tvl')

	const { finalProtocols, charts } = useMemo<{
		finalProtocols: IProtocolByCategoryOrTagPageData['protocols']
		charts: IProtocolByCategoryOrTagPageData['charts']
	}>(() => {
		const toggledSettings = TVL_SETTINGS_KEYS.filter((key) => tvlSettings[key])

		if (toggledSettings.length === 0) return { finalProtocols: props.protocols, charts: props.charts }

		const finalProtocols = props.protocols.map((protocol) => {
			let tvl = protocol.tvl
			for (const setting of toggledSettings) {
				if (protocol.extraTvls[setting] == null) continue
				tvl = (tvl ?? 0) + (protocol.extraTvls[setting] ?? 0)
			}
			return { ...protocol, tvl }
		})

		const shouldMirrorBorrowedChart = props.effectiveCategory === 'Lending' && toggledSettings.includes('borrowed')

		const finalSource: IProtocolByCategoryOrTagPageData['charts']['dataset']['source'] =
			props.charts.dataset.source.map((row) => {
				const timestampKey = row.timestamp
				const extraSum =
					timestampKey == null
						? 0
						: toggledSettings.reduce((sum, e) => sum + (props.extraTvlCharts[e]?.[timestampKey] ?? 0), 0)
				const currentTvlValue = typeof row.TVL === 'number' ? row.TVL : Number(row.TVL ?? 0)
				const safeCurrentTvlValue = Number.isFinite(currentTvlValue) ? currentTvlValue : 0
				const nextTvlValue = safeCurrentTvlValue + extraSum
				const timestamp = row.timestamp

				if (shouldMirrorBorrowedChart) {
					return { ...row, timestamp, TVL: nextTvlValue, Borrowed: nextTvlValue }
				}

				return { ...row, timestamp, TVL: nextTvlValue }
			})

		return {
			finalProtocols,
			charts: {
				...props.charts,
				dataset: { ...props.charts.dataset, source: finalSource }
			}
		}
	}, [tvlSettings, props.protocols, props.charts, props.extraTvlCharts, props.effectiveCategory])

	const chartSeries = useMemo(() => charts.charts ?? [], [charts.charts])

	const categoryColumns = useMemo(() => {
		return columns(props.effectiveCategory)
	}, [props.effectiveCategory])

	const hasBarCharts = useMemo(() => {
		return chartSeries.some((series) => {
			if (series.type !== 'bar') return false
			const yDimension = typeof series.encode.y === 'string' ? series.encode.y : null
			if (!yDimension) return false

			return charts.dataset.source.some((row) => {
				const rawValue = row[yDimension]
				if (rawValue == null) return false
				const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
				return Number.isFinite(value)
			})
		})
	}, [chartSeries, charts.dataset.source])

	const groupedCharts = useMemo(() => {
		if (!hasBarCharts) return charts

		const dataBySeries = new Map<string, Map<number, number | null>>()
		const dimensionOrder: string[] = []
		const groupedSeries: Array<(typeof chartSeries)[number]> = []
		for (const series of chartSeries) {
			const yDimension = typeof series.encode.y === 'string' ? series.encode.y : null

			if (!yDimension) {
				groupedSeries.push(series)
				continue
			}

			dimensionOrder.push(yDimension)

			const rawData: Array<[number, number]> = []
			for (const row of charts.dataset.source) {
				const timestamp = Number(row.timestamp)
				const rawValue = row[yDimension]
				if (rawValue == null) continue
				const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
				if (!Number.isFinite(timestamp) || !Number.isFinite(value)) continue
				rawData.push([timestamp, value])
			}

			const groupedData =
				series.type === 'bar'
					? formatBarChart({
							data: rawData,
							groupBy,
							dateInMs: true,
							denominationPriceHistory: null
						})
					: formatLineChart({
							data: rawData,
							groupBy,
							dateInMs: true,
							denominationPriceHistory: null
						})

			dataBySeries.set(yDimension, new Map(groupedData.map(([timestamp, value]) => [timestamp, value])))

			groupedSeries.push({
				...series,
				type: series.type === 'bar' && groupBy === 'cumulative' ? 'line' : series.type
			})
		}

		const timestamps = new Set<number>()
		for (const points of dataBySeries.values()) {
			for (const timestamp of points.keys()) {
				timestamps.add(timestamp)
			}
		}

		const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b)

		return {
			...charts,
			dataset: {
				source: sortedTimestamps.map((timestamp) => {
					const row: Record<string, number | null> = { timestamp }
					for (const dimension of dimensionOrder) {
						row[dimension] = dataBySeries.get(dimension)?.get(timestamp) ?? null
					}
					return row
				}),
				dimensions: ['timestamp', ...dimensionOrder]
			},
			charts: groupedSeries
		}
	}, [charts, chartSeries, groupBy, hasBarCharts])
	const deferredGroupedCharts = useDeferredValue(groupedCharts)

	const chartGroupBy = groupBy === 'cumulative' ? 'daily' : groupBy

	return (
		<>
			{props.chains.length > 1 ? <RowLinksWithDropdown links={props.chains} activeLink={props.chain} /> : null}
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					{props.chain === 'All' ? (
						<h1 className="text-lg font-semibold">{categoryPresentation.headingLabel}</h1>
					) : (
						<h1 className="text-lg font-semibold">{`${categoryPresentation.headingLabel} on ${props.chain}`}</h1>
					)}
					<div className="mb-auto flex flex-1 flex-col gap-2">
						{props.charts.dataset?.source.length > 0 && (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								{props.effectiveCategory === 'RWA' ? (
									<Tooltip
										content="Sum of value of all real world assets on chain"
										className="font-normal text-(--text-label) underline decoration-dotted"
									>
										Total RWA Value
									</Tooltip>
								) : (
									<Tooltip
										content="Sum of value of all coins held in smart contracts of all the protocols on the chain"
										className="font-normal text-(--text-label) underline decoration-dotted"
									>
										Total Value Locked
									</Tooltip>
								)}

								<span className="text-right font-jetbrains">
									{formattedNum(charts.dataset?.source[charts.dataset?.source.length - 1]?.TVL, true)}
								</span>
							</p>
						)}
						{props.optionsPremium7d != null && (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								<Tooltip
									content={definitions.optionsPremium.chain['7d']}
									className="font-normal text-(--text-label) underline decoration-dotted"
								>
									Premium Volume (7d)
								</Tooltip>
								<span className="text-right font-jetbrains">{formattedNum(props.optionsPremium7d, true)}</span>
							</p>
						)}
						{props.optionsNotional7d != null && (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								<Tooltip
									content={definitions.optionsNotional.chain['7d']}
									className="font-normal text-(--text-label) underline decoration-dotted"
								>
									Notional Volume (7d)
								</Tooltip>
								<span className="text-right font-jetbrains">{formattedNum(props.optionsNotional7d, true)}</span>
							</p>
						)}
						{props.fees7d != null && (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								<Tooltip
									content={definitions.fees.chain['7d']}
									className="font-normal text-(--text-label) underline decoration-dotted"
								>
									Fees (7d)
								</Tooltip>
								<span className="text-right font-jetbrains">{formattedNum(props.fees7d, true)}</span>
							</p>
						)}
						{props.revenue7d != null && (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								<Tooltip
									content={definitions.revenue.chain['7d']}
									className="font-normal text-(--text-label) underline decoration-dotted"
								>
									Revenue (7d)
								</Tooltip>
								<span className="text-right font-jetbrains">{formattedNum(props.revenue7d, true)}</span>
							</p>
						)}
						{props.dexVolume7d != null && (
							<>
								{props.effectiveCategory === 'Dexs' ? (
									<p className="flex flex-wrap items-center justify-between gap-4 text-base">
										<Tooltip
											content={definitions.dexs.protocol['7d']}
											className="font-normal text-(--text-label) underline decoration-dotted"
										>
											DEX Volume (7d)
										</Tooltip>
										<span className="text-right font-jetbrains">{formattedNum(props.dexVolume7d, true)}</span>
									</p>
								) : props.effectiveCategory === 'DEX Aggregators' || props.effectiveCategory === 'DEX Aggregator' ? (
									<p className="flex flex-wrap items-center justify-between gap-4 text-base">
										<Tooltip
											content={definitions.dexAggregators.protocol['7d']}
											className="font-normal text-(--text-label) underline decoration-dotted"
										>
											DEX Aggregator Volume (7d)
										</Tooltip>
										<span className="text-right font-jetbrains">{formattedNum(props.dexVolume7d, true)}</span>
									</p>
								) : props.effectiveCategory === 'Prediction Market' ? (
									<p className="flex flex-wrap items-center justify-between gap-4 text-base">
										<span className="font-normal text-(--text-label)">Prediction Market Volume (7d)</span>
										<span className="text-right font-jetbrains">{formattedNum(props.dexVolume7d, true)}</span>
									</p>
								) : (
									<p className="flex flex-wrap items-center justify-between gap-4 text-base">
										<span className="font-normal text-(--text-label)">Volume (7d)</span>
										<span className="text-right font-jetbrains">{formattedNum(props.dexVolume7d, true)}</span>
									</p>
								)}
							</>
						)}
						{props.perpVolume7d != null && (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								<Tooltip
									content={definitions.perps.protocol['7d']}
									className="font-normal text-(--text-label) underline decoration-dotted"
								>
									Perp Volume (7d)
								</Tooltip>
								<span className="text-right font-jetbrains">{formattedNum(props.perpVolume7d, true)}</span>
							</p>
						)}
						{props.openInterest != null && (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								<Tooltip
									content={definitions.openInterest.common}
									className="font-normal text-(--text-label) underline decoration-dotted"
								>
									Open Interest
								</Tooltip>
								<span className="text-right font-jetbrains">{formattedNum(props.openInterest, true)}</span>
							</p>
						)}
					</div>
				</div>
				<div className="col-span-2 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex items-center justify-end gap-2 p-2 pb-0">
						{hasBarCharts ? (
							<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
								{CHART_INTERVALS_LIST.map((dataInterval) => (
									<Tooltip
										content={`${dataInterval.slice(0, 1).toUpperCase()}${dataInterval.slice(1)}`}
										render={<button />}
										className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
										data-active={groupBy === dataInterval}
										onClick={() => {
											startTransition(() => setGroupBy(dataInterval))
										}}
										key={`${name}-category-groupBy-${dataInterval}`}
									>
										{dataInterval.slice(0, 1).toUpperCase()}
									</Tooltip>
								))}
							</div>
						) : null}
						<ChartExportButtons
							chartInstance={chartInstance}
							filename={`protocols-${namePrefix}${props.chain || 'all'}`}
							title={
								props.chain === 'All'
									? categoryPresentation.headingLabel
									: `${categoryPresentation.headingLabel} on ${props.chain}`
							}
						/>
					</div>
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<MultiSeriesChart2
							dataset={deferredGroupedCharts.dataset}
							charts={deferredGroupedCharts.charts}
							groupBy={chartGroupBy}
							hideDefaultLegend={false}
							valueSymbol="$"
							onReady={handleChartReady}
						/>
					</Suspense>
				</div>
			</div>
			<TableWithSearch
				data={finalProtocols}
				columns={categoryColumns}
				placeholder={categoryPresentation.searchPlaceholder}
				columnToSearch="name"
				header={categoryPresentation.tableHeader}
				sortingState={defaultSortingState[name] ?? [{ id: 'tvl', desc: true }]}
				csvFileName={`defillama-${namePrefix}${props.chain || 'all'}-protocols`}
			/>
		</>
	)
}

type ProtocolRow = IProtocolByCategoryOrTagPageData['protocols'][0]
type Column = ColumnDef<ProtocolRow>

// ============================================================================
// Base Columns (used by most categories)
// ============================================================================

const ProtocolChainsComponent = ({ chains }: { chains: string[] }) => (
	<span className="flex flex-col gap-1">
		{chains.map((chain) => (
			<span key={`chain${chain}-of-protocol`} className="flex items-center gap-1">
				<TokenLogo logo={chainIconUrl(chain)} size={14} />
				<span>{chain}</span>
			</span>
		))}
	</span>
)

const nameColumn: Column = {
	id: 'name',
	header: 'Name',
	accessorFn: (protocol) => protocol.name,
	enableSorting: false,
	cell: ({ getValue, row }) => {
		const value = getValue<string>()

		return (
			<span className={`relative flex items-center gap-2 ${row.depth > 0 ? 'pl-8' : 'pl-4'}`}>
				{row.subRows?.length > 0 ? (
					<button
						className="absolute -left-0.5"
						{...{
							onClick: row.getToggleExpandedHandler()
						}}
					>
						{row.getIsExpanded() ? (
							<>
								<Icon name="chevron-down" height={16} width={16} />
								<span className="sr-only">View child protocols</span>
							</>
						) : (
							<>
								<Icon name="chevron-right" height={16} width={16} />
								<span className="sr-only">Hide child protocols</span>
							</>
						)}
					</button>
				) : null}

				<span className="vf-row-index shrink-0" aria-hidden="true" />

				<TokenLogo logo={row.original.logo} data-lgonly />

				<span className="-my-2 flex flex-col">
					<BasicLink
						href={`/protocol/${row.original.slug}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{value}
					</BasicLink>

					<Tooltip
						content={<ProtocolChainsComponent chains={row.original.chains} />}
						className="text-[0.7rem] text-(--text-disabled)"
					>
						{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
					</Tooltip>
				</span>
			</span>
		)
	},
	size: 280
}

const tvlColumn = (effectiveCategory: string | null): Column => ({
	id: 'tvl',
	header: effectiveCategory === 'RWA' ? 'Total Assets' : 'TVL',
	accessorFn: (protocol) => protocol.tvl,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: 'Sum of value of all coins held in smart contracts of the protocol'
	},
	size: 120
})

const mcapTvlColumn: Column = {
	id: 'mcap/tvl',
	header: 'Mcap/TVL',
	accessorFn: (protocol) => (protocol.mcap && protocol.tvl ? formatNum(protocol.mcap / protocol.tvl) : null),
	cell: (info) => <>{info.getValue() != null ? info.getValue() : null}</>,
	meta: {
		align: 'end',
		headerHelperText: 'Market cap / TVL ratio'
	},
	size: 110
}

// ============================================================================
// Fees & Revenue Columns
// ============================================================================

const fees7dColumn: Column = {
	id: 'fees_7d',
	header: 'Fees 7d',
	accessorFn: (protocol) => protocol.fees?.total7d,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: definitions.fees.protocol['7d']
	},
	size: 100
}

const revenue7dColumn: Column = {
	id: 'revenue_7d',
	header: 'Revenue 7d',
	accessorFn: (protocol) => protocol.revenue?.total7d,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: definitions.revenue.protocol['7d']
	},
	size: 128
}

const fees30dColumn: Column = {
	id: 'fees_30d',
	header: 'Fees 30d',
	accessorFn: (protocol) => protocol.fees?.total30d,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: definitions.fees.protocol['30d']
	},
	size: 100
}

const revenue30dColumn: Column = {
	id: 'revenue_30d',
	header: 'Revenue 30d',
	accessorFn: (protocol) => protocol.revenue?.total30d,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: definitions.revenue.protocol['30d']
	},
	size: 128
}

const fees24hColumn: Column = {
	id: 'fees_24h',
	header: 'Fees 24h',
	accessorFn: (protocol) => protocol.fees?.total24h,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: definitions.fees.protocol['24h']
	},
	size: 100
}

const revenue24hColumn: Column = {
	id: 'revenue_24h',
	header: 'Revenue 24h',
	accessorFn: (protocol) => protocol.revenue?.total24h,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: definitions.revenue.protocol['24h']
	},
	size: 128
}

// ============================================================================
// RWA Columns
// ============================================================================

const rwaAssetClassColumn = (category: string): Column => ({
	id: 'asset_class',
	header: 'Asset Class',
	accessorFn: (protocol) => protocol.tags?.join(', '),
	enableSorting: false,
	cell: (info) => {
		if (info.row.original.tags.length === 0) return null
		return (
			<span className="flex flex-nowrap justify-end gap-1">
				<BasicLink
					href={`/protocols/${slug(info.row.original.tags[0])}`}
					className="text-sm font-medium whitespace-nowrap text-(--link-text) hover:underline"
				>
					{info.row.original.tags[0]}
				</BasicLink>
				{info.row.original.tags.length > 1 && (
					<Tooltip
						content={
							<span className="flex flex-col gap-1">
								{info.row.original.tags.slice(1).map((tag) => (
									<BasicLink
										key={`protocols-${category}-${tag}`}
										href={`/protocols/${slug(tag)}`}
										className="text-sm font-medium whitespace-nowrap text-(--link-text) hover:underline"
									>
										{tag}
									</BasicLink>
								))}
							</span>
						}
					>
						<span className="text-sm font-medium whitespace-nowrap text-(--text-disabled)">
							{`+${info.row.original.tags.length - 1}`}
						</span>
					</Tooltip>
				)}
			</span>
		)
	},
	meta: {
		align: 'end'
	},
	size: 180
})

const rwaStatsColumns: Column[] = [
	{
		id: 'rwa_redeemable',
		header: 'Redeemable',
		accessorFn: (protocol) => protocol.rwaStats?.redeemable,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),

		meta: {
			align: 'end',
			headerHelperText: 'Whether the asset can be redeemed for the underlying'
		},
		size: 120
	},
	{
		id: 'rwa_attestations',
		header: 'Attestations',
		accessorFn: (protocol) => protocol.rwaStats?.attestations,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),

		meta: {
			align: 'end',
			headerHelperText: 'Whether the platform publishes holdings reports'
		},
		size: 120
	},
	{
		id: 'rwa_cex_listed',
		header: 'CEX Listed',
		accessorFn: (protocol) => protocol.rwaStats?.cexListed,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),

		meta: {
			align: 'end',
			headerHelperText: 'Whether the asset is listed on a CEX'
		},
		size: 120
	},
	{
		id: 'rwa_kyc',
		header: 'KYC',
		accessorFn: (protocol) => protocol.rwaStats?.kyc,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),

		meta: {
			align: 'end',
			headerHelperText: 'Whether the asset requires KYC to mint and redeem'
		},
		size: 80
	},
	{
		id: 'rwa_transferable',
		header: 'Transferable',
		accessorFn: (protocol) => protocol.rwaStats?.transferable,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),

		meta: {
			align: 'end',
			headerHelperText: 'Whether the asset can be transferred freely to third parties'
		},
		size: 120
	},
	{
		id: 'rwa_self_custody',
		header: 'Self Custody',
		accessorFn: (protocol) => protocol.rwaStats?.selfCustody,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),

		meta: {
			align: 'end',
			headerHelperText: 'Whether the asset can be self-custodied'
		},
		size: 120
	},
	{
		id: 'rwa_liquidity',
		header: 'Liquidity',
		accessorFn: (protocol) => protocol.rwaStats?.tvlUsd,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,

		meta: {
			align: 'end',
			headerHelperText: 'Liquidity of the asset in tracked pools'
		},
		size: 120
	},
	{
		id: 'rwa_volume_7d',
		header: 'Volume 7d',
		accessorFn: (protocol) => protocol.rwaStats?.volumeUsd7d,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,

		meta: {
			align: 'end',
			headerHelperText: 'Volume of trades across tracked pools in the last 7 days'
		},
		size: 120
	},
	{
		id: 'rwa_volume_24h',
		header: 'Volume 24h',
		accessorFn: (protocol) => protocol.rwaStats?.volumeUsd1d,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,

		meta: {
			align: 'end',
			headerHelperText: 'Volume of trades across tracked pools in the last 24 hours'
		},
		size: 120
	}
]

// ============================================================================
// Perp Volume Columns (Derivatives / Interface)
// ============================================================================

const perpVolume24hColumn: Column = {
	id: 'perp_volume_24h',
	header: 'Perp Volume 24h',
	accessorFn: (protocol) => protocol.perpVolume?.total24h,
	cell: (info) => {
		if (info.getValue() == null) return null
		const helpers = []
		if (info.row.original.perpVolume?.zeroFeePerp) {
			helpers.push('This protocol charges no fees for most of its users')
		}
		// if (info.getValue() != null && info.row.original.perpVolume?.doublecounted) {
		// 	helpers.push(
		// 		"This protocol is a wrapper interface over another protocol. Its volume is excluded from totals to avoid double-counting the underlying protocol's volume"
		// 	)
		// }

		if (helpers.length > 0) {
			return (
				<span className="flex items-center justify-end gap-1">
					{helpers.map((helper) => (
						<QuestionHelper key={`${info.row.original.name}-${helper}`} text={helper} />
					))}
					<span className={info.row.original.perpVolume?.doublecounted ? 'text-(--text-disabled)' : ''}>
						{formattedNum(info.getValue(), true)}
					</span>
				</span>
			)
		}

		return <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>
	},
	meta: {
		align: 'end',
		headerHelperText: definitions.perps.protocol['24h']
	},
	size: 160
}

const openInterestColumn: Column = {
	header: 'Open Interest',
	id: 'open_interest',
	accessorFn: (protocol) => protocol.openInterest?.total24h,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: definitions.openInterest.protocol
	},
	size: 160
}

const perpVolume7dColumn: Column = {
	id: 'perp_volume_7d',
	header: 'Perp Volume 7d',
	accessorFn: (protocol) => protocol.perpVolume?.total7d,
	cell: (info) => {
		if (info.getValue() == null) return null
		const helpers = []
		if (info.row.original.perpVolume?.zeroFeePerp) {
			helpers.push('This protocol charges no fees for most of its users')
		}
		// if (info.getValue() != null && info.row.original.perpVolume?.doublecounted) {
		// 	helpers.push(
		// 		"This protocol is a wrapper interface over another protocol. Its volume is excluded from totals to avoid double-counting the underlying protocol's volume"
		// 	)
		// }

		if (helpers.length > 0) {
			return (
				<span className="flex items-center justify-end gap-1">
					{helpers.map((helper) => (
						<QuestionHelper key={`${info.row.original.name}-${helper}`} text={helper} />
					))}
					<span className={info.row.original.perpVolume?.doublecounted ? 'text-(--text-disabled)' : ''}>
						{formattedNum(info.getValue(), true)}
					</span>
				</span>
			)
		}

		return <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>
	},
	meta: {
		align: 'end',
		headerHelperText: definitions.perps.protocol['7d']
	},
	size: 160
}

const perpVolume30dColumn: Column = {
	id: 'perp_volume_30d',
	header: 'Perp Volume 30d',
	accessorFn: (protocol) => protocol.perpVolume?.total30d,
	cell: (info) => {
		if (info.getValue() == null) return null
		const helpers = []
		if (info.row.original.perpVolume?.zeroFeePerp) {
			helpers.push('This protocol charges no fees for most of its users')
		}
		// if (info.getValue() != null && info.row.original.perpVolume?.doublecounted) {
		// 	helpers.push(
		// 		"This protocol is a wrapper interface over another protocol. Its volume is excluded from totals to avoid double-counting the underlying protocol's volume"
		// 	)
		// }

		if (helpers.length > 0) {
			return (
				<span className="flex items-center justify-end gap-1">
					{helpers.map((helper) => (
						<QuestionHelper key={`${info.row.original.name}-${helper}`} text={helper} />
					))}
					<span className={info.row.original.perpVolume?.doublecounted ? 'text-(--text-disabled)' : ''}>
						{formattedNum(info.getValue(), true)}
					</span>
				</span>
			)
		}

		return <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>
	},
	meta: {
		align: 'end',
		headerHelperText: definitions.perps.protocol['30d']
	},
	size: 160
}

// ============================================================================
// DEX Volume Columns
// ============================================================================

const dexVolume7dColumn: Column = {
	id: 'dex_volume_7d',
	header: 'DEX Volume 7d',
	accessorFn: (protocol) => protocol.dexVolume?.total7d,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: definitions.dexs.protocol['7d']
	},
	size: 140
}

const dexVolume30dColumn: Column = {
	id: 'dex_volume_30d',
	header: 'DEX Volume 30d',
	accessorFn: (protocol) => protocol.dexVolume?.total30d,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: definitions.dexs.protocol['30d']
	},
	size: 148
}

const dexVolume24hColumn: Column = {
	id: 'dex_volume_24h',
	header: 'DEX Volume 24h',
	accessorFn: (protocol) => protocol.dexVolume?.total24h,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: definitions.dexs.protocol['24h']
	},
	size: 148
}

// ============================================================================
// DEX Aggregator Volume Columns
// ============================================================================

const dexAggregatorVolume7dColumn: Column = {
	id: 'dex_aggregator_volume_7d',
	header: 'DEX Aggregator Volume 7d',
	accessorFn: (protocol) => protocol.dexVolume?.total7d,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: definitions.dexAggregators.protocol['7d']
	},
	size: 140
}

const dexAggregatorVolume30dColumn: Column = {
	id: 'dex_aggregator_volume_30d',
	header: 'DEX Aggregator Volume 30d',
	accessorFn: (protocol) => protocol.dexVolume?.total30d,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: definitions.dexAggregators.protocol['30d']
	},
	size: 148
}

const dexAggregatorVolume24hColumn: Column = {
	id: 'dex_aggregator_volume_24h',
	header: 'DEX Aggregator Volume 24h',
	accessorFn: (protocol) => protocol.dexVolume?.total24h,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: definitions.dexAggregators.protocol['24h']
	},
	size: 148
}

// ============================================================================
// Prediction Market Volume Columns
// ============================================================================

const predictionMarketVolume7dColumn: Column = {
	id: 'prediction_market_volume_7d',
	header: 'Volume 7d',
	accessorFn: (protocol) => protocol.dexVolume?.total7d,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end'
	},
	size: 140
}

const predictionMarketVolume30dColumn: Column = {
	id: 'prediction_market_volume_30d',
	header: 'Volume 30d',
	accessorFn: (protocol) => protocol.dexVolume?.total30d,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end'
	},
	size: 148
}

const predictionMarketVolume24hColumn: Column = {
	id: 'prediction_market_volume_24h',
	header: 'Volume 24h',
	accessorFn: (protocol) => protocol.dexVolume?.total24h,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end'
	},
	size: 148
}

const cryptoCardIssuerVolume7dColumn: Column = {
	id: 'crypto_card_issuer_volume_7d',
	header: 'Volume 7d',
	accessorFn: (protocol) => protocol.dexVolume?.total7d,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end'
	},
	size: 140
}

const cryptoCardIssuerVolume30dColumn: Column = {
	id: 'crypto_card_issuer_volume_30d',
	header: 'Volume 30d',
	accessorFn: (protocol) => protocol.dexVolume?.total30d,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end'
	},
	size: 148
}

const cryptoCardIssuerVolume24hColumn: Column = {
	id: 'crypto_card_issuer_volume_24h',
	header: 'Volume 24h',
	accessorFn: (protocol) => protocol.dexVolume?.total24h,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end'
	},
	size: 148
}
// ============================================================================
// Lending Columns
// ============================================================================

const lendingColumns: Column[] = [
	{
		id: 'borrowed',
		header: 'Borrowed',
		accessorFn: (protocol) => protocol.borrowed,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,

		meta: {
			align: 'end',
			headerHelperText: 'Total amount borrowed from the protocol'
		},
		size: 100
	},
	{
		id: 'supplied',
		header: 'Supplied',
		accessorFn: (protocol) => protocol.supplied,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,

		meta: {
			align: 'end',
			headerHelperText: 'Total amount supplied to the protocol'
		},
		size: 100
	},
	{
		id: 'supplied/tvl',
		header: 'Supplied/TVL',
		accessorFn: (protocol) => protocol.suppliedTvl,
		cell: (info) => <>{info.getValue() ?? null}</>,

		meta: {
			align: 'end',
			headerHelperText: '(Total amount supplied / Total value locked) ratio'
		},
		size: 140
	}
]

// ============================================================================
// Options Columns
// ============================================================================

const optionsPremium24hColumn: Column = {
	id: 'options_premium_24h',
	header: 'Premium Volume 24h',
	accessorFn: (protocol) => protocol.optionsPremium?.total24h,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: definitions.optionsPremium.protocol['24h']
	},
	size: 180
}

const optionsPremium7dColumn: Column = {
	id: 'options_premium_7d',
	header: 'Premium Volume 7d',
	accessorFn: (protocol) => protocol.optionsPremium?.total7d,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: definitions.optionsPremium.protocol['7d']
	},
	size: 180
}

const optionsPremium30dColumn: Column = {
	id: 'options_premium_30d',
	header: 'Premium Volume 30d',
	accessorFn: (protocol) => protocol.optionsPremium?.total30d,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: definitions.optionsPremium.protocol['30d']
	},
	size: 180
}

const optionsNotional24hColumn: Column = {
	id: 'options_notional_24h',
	header: 'Notional Volume 24h',
	accessorFn: (protocol) => protocol.optionsNotional?.total24h,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: definitions.optionsNotional.protocol['24h']
	},
	size: 180
}

const optionsNotional7dColumn: Column = {
	id: 'options_notional_7d',
	header: 'Notional Volume 7d',
	accessorFn: (protocol) => protocol.optionsNotional?.total7d,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: definitions.optionsNotional.protocol['7d']
	},
	size: 180
}

const optionsNotional30dColumn: Column = {
	id: 'options_notional_30d',
	header: 'Notional Volume 30d',
	accessorFn: (protocol) => protocol.optionsNotional?.total30d,
	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	meta: {
		align: 'end',
		headerHelperText: definitions.optionsNotional.protocol['30d']
	},
	size: 180
}

// ============================================================================
// Column Composition Function
// ============================================================================

const getVolumeColumn = (category: string | null, period: '7d' | '30d' | '24h'): Column | null => {
	if (category == null) return null

	const volumeColumns: Record<string, Record<'7d' | '30d' | '24h', Column>> = {
		Dexs: { '7d': dexVolume7dColumn, '30d': dexVolume30dColumn, '24h': dexVolume24hColumn },
		'DEX Aggregators': {
			'7d': dexAggregatorVolume7dColumn,
			'30d': dexAggregatorVolume30dColumn,
			'24h': dexAggregatorVolume24hColumn
		},
		'DEX Aggregator': {
			'7d': dexAggregatorVolume7dColumn,
			'30d': dexAggregatorVolume30dColumn,
			'24h': dexAggregatorVolume24hColumn
		},
		'Prediction Market': {
			'7d': predictionMarketVolume7dColumn,
			'30d': predictionMarketVolume30dColumn,
			'24h': predictionMarketVolume24hColumn
		},
		'Crypto Card Issuer': {
			'7d': cryptoCardIssuerVolume7dColumn,
			'30d': cryptoCardIssuerVolume30dColumn,
			'24h': cryptoCardIssuerVolume24hColumn
		}
	}

	return volumeColumns[category]?.[period] ?? null
}

const columns = (effectiveCategory: IProtocolByCategoryOrTagPageData['effectiveCategory']): Column[] => {
	const columnBehavior = getProtocolCategoryColumnBehavior(effectiveCategory)

	return [
		// Base
		nameColumn,

		// RWA Asset Class
		columnBehavior.showRwaAssetClass ? rwaAssetClassColumn('RWA') : null,

		// Perp columns (Derivatives & Interface)
		columnBehavior.showPerpColumns ? perpVolume24hColumn : null,
		columnBehavior.showOpenInterest ? openInterestColumn : null,
		columnBehavior.showPerpColumns ? perpVolume7dColumn : null,
		columnBehavior.showPerpColumns ? perpVolume30dColumn : null,

		// TVL (not for Interface)
		columnBehavior.showTvl ? tvlColumn(effectiveCategory) : null,

		// RWA stats
		...(columnBehavior.showRwaStats ? rwaStatsColumns : []),

		// Volume & Fees & Revenue 7d
		getVolumeColumn(effectiveCategory, '7d'),
		...(columnBehavior.showOptionColumns ? [optionsPremium7dColumn, optionsNotional7dColumn] : []),
		fees7dColumn,
		revenue7dColumn,

		// Mcap/TVL
		mcapTvlColumn,

		// Volume & Fees & Revenue 30d
		getVolumeColumn(effectiveCategory, '30d'),
		...(columnBehavior.showOptionColumns ? [optionsPremium30dColumn, optionsNotional30dColumn] : []),
		fees30dColumn,
		revenue30dColumn,

		// Volume & Fees & Revenue 24h
		getVolumeColumn(effectiveCategory, '24h'),
		...(columnBehavior.showOptionColumns ? [optionsPremium24hColumn, optionsNotional24hColumn] : []),
		fees24hColumn,
		revenue24hColumn,

		// Lending
		...(columnBehavior.showLendingColumns ? lendingColumns : [])
	].filter((col): col is Column => col !== null)
}
