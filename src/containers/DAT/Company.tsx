import type { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { lazy, Suspense, useMemo, useState } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import type { ICandlestickChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TagGroup } from '~/components/TagGroup'
import { Tooltip } from '~/components/Tooltip'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { formattedNum, slug } from '~/utils'
import type { IDATCompanyPageProps } from './types'

const DEFAULT_SORTING_STATE = [{ id: 'report_date', desc: true }]

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))
const CandlestickChart: React.LazyExoticComponent<React.ComponentType<ICandlestickChartProps>> = lazy(
	() => import('~/components/ECharts/CandlestickChart')
)

function getType(type: string): string {
	switch (type) {
		case 'purchase':
			return 'Purchase'
		case 'sale':
			return 'Sale'
		case 'mined':
			return 'Mined'
		case 'staking_reward':
			return 'Staking Reward'
		default:
			return type
	}
}

function getSourceType(sourceType: string): string {
	switch (sourceType) {
		case 'filing':
			return 'Filing'
		case 'twitter':
			return 'Twitter'
		case 'press-release':
			return 'Press Release'
		case 'site':
			return 'Site'
		case 'other':
			return 'Other'
		default:
			return sourceType
	}
}

export function DATCompany(props: IDATCompanyPageProps) {
	const [selectedAsset, setSelectedAsset] = useState<string>(props.assets[0] ?? '')
	const { chartInstance, handleChartReady } = useGetChartInstance()
	const chartData = useMemo(() => {
		return props.chartByAsset.find((asset) => asset.ticker === selectedAsset)
	}, [selectedAsset, props.chartByAsset])

	return (
		<>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:col-span-1">
					<h1 className="text-xl font-semibold">{props.name}</h1>
					<div className="flex flex-col">
						{props.assetsBreakdown.length > 1 ? (
							<>
								<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
									<span className="text-(--text-label)">Assets in Holdings</span>
									<span className="ml-auto font-jetbrains">{props.assets.join(', ')}</span>
								</p>
								{props.totalUsdValue != null ? (
									<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
										<span className="text-(--text-label)">Assets Today's Value (USD)</span>
										<span className="ml-auto font-jetbrains">{formattedNum(props.totalUsdValue, true)}</span>
									</p>
								) : null}
								{props.totalCost != null ? (
									<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
										<span className="text-(--text-label)">Assets Cost Basis</span>
										<span className="ml-auto font-jetbrains">
											{props.totalCost != null ? formattedNum(props.totalCost, true) : '-'}
										</span>
									</p>
								) : null}
							</>
						) : null}
						{props.assetsBreakdown.map((asset, index) => (
							<details
								className="group"
								key={`${props.ticker}-${asset.name}`}
								open={props.assetsBreakdown.length === 1 && index === 0}
							>
								<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
									<span className="text-(--text-label)">Total {asset.name}</span>
									<Icon
										name="chevron-down"
										height={16}
										width={16}
										className="relative top-0.5 -ml-3 transition-transform duration-100 group-open:rotate-180"
									/>
									<span className="ml-auto font-jetbrains">
										{formattedNum(asset.amount, false)} {asset.ticker}
									</span>
								</summary>
								<div className="mb-3 flex flex-col">
									<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
										<span className="text-(--text-label)">Today's Value (USD)</span>
										<span className="ml-auto justify-end overflow-hidden font-jetbrains text-ellipsis whitespace-nowrap">
											{asset.usdValue != null ? formattedNum(asset.usdValue, true) : null}
										</span>
									</p>
									<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
										<span className="text-(--text-label)">Cost Basis</span>
										<span className="ml-auto justify-end overflow-hidden font-jetbrains text-ellipsis whitespace-nowrap">
											{asset.cost != null ? formattedNum(asset.cost, true) : '-'}
										</span>
									</p>
									<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
										<span className="text-(--text-label)">Average Purchase Price</span>
										<span className="ml-auto justify-end overflow-hidden font-jetbrains text-ellipsis whitespace-nowrap">
											{asset.avgPrice != null ? formattedNum(asset.avgPrice, true) : '-'}
										</span>
									</p>
								</div>
							</details>
						))}
						<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
							<span className="text-(--text-label)">First Announcement</span>
							<span className="ml-auto font-jetbrains">
								{props.firstAnnouncementDate != null ? dayjs(props.firstAnnouncementDate).format('MMM D, YYYY') : null}
							</span>
						</p>
						<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
							<span className="text-(--text-label)">Latest Announcement</span>
							<span className="ml-auto font-jetbrains">
								{props.lastAnnouncementDate != null ? dayjs(props.lastAnnouncementDate).format('MMM D, YYYY') : null}
							</span>
						</p>
						<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
							<span className="text-(--text-label)">Total Transactions</span>
							<span className="ml-auto font-jetbrains">{props.transactions.length}</span>
						</p>
						{props.price != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<span className="text-(--text-label)">${props.ticker} price</span>
								{props.priceChange24h != null ? (
									<Tooltip
										content={
											<>
												24h change:{' '}
												<span className={props.priceChange24h > 0 ? 'text-(--success)' : 'text-(--error)'}>
													{`${props.priceChange24h > 0 ? '+' : ''}${props.priceChange24h.toFixed(2)}%`}
												</span>
											</>
										}
										className="ml-auto font-jetbrains underline decoration-dotted"
									>
										${props.price}
									</Tooltip>
								) : (
									<span className="ml-auto font-jetbrains">${props.price}</span>
								)}
							</p>
						) : null}
						{props.realized_mNAV != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<Tooltip
									content="Market Net Asset Value based only on the current outstanding common shares, with no dilution considered"
									className="text-(--text-label) underline decoration-dotted"
								>
									Realized mNAV
								</Tooltip>
								<span className="ml-auto font-jetbrains">{formattedNum(props.realized_mNAV, false)}</span>
							</p>
						) : null}
						{props.realistic_mNAV != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<Tooltip
									content="Market Net asset value adjusted for expected dilution from in-the-money options and convertibles that are likely to be exercised"
									className="text-(--text-label) underline decoration-dotted"
								>
									Realistic mNAV
								</Tooltip>
								<span className="ml-auto font-jetbrains">{formattedNum(props.realistic_mNAV, false)}</span>
							</p>
						) : null}
						{props.max_mNAV != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<Tooltip
									content={`Market Net Asset Value under the fully diluted scenario, assuming every warrant, option, and convertible is exercised (the most conservative/worst-case view)`}
									className="text-(--text-label) underline decoration-dotted"
								>
									Max mNAV
								</Tooltip>
								<span className="ml-auto font-jetbrains">{formattedNum(props.max_mNAV, false)}</span>
							</p>
						) : null}
					</div>
					<BasicLink href="/report-error" className="mt-auto mr-auto pt-4 text-left text-(--text-form) underline">
						Report incorrect data
					</BasicLink>
				</div>
				<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex items-center justify-end gap-2 p-2 pb-0">
						<h1 className="mr-auto text-base font-semibold">Cumulative Holdings Over Time</h1>
						{props.assets.length > 1 ? (
							<TagGroup
								selectedValue={selectedAsset}
								setValue={setSelectedAsset}
								values={props.assets}
								variant="responsive"
							/>
						) : null}
						<ChartExportButtons
							chartInstance={chartInstance}
							filename={`${slug(props.name)}-holdings`}
							title="Cumulative Holdings Over Time"
						/>
					</div>
					<Suspense fallback={<div className="min-h-[360px]" />}>
						{chartData != null ? (
							<MultiSeriesChart2
								dataset={chartData.holdingsChart.dataset}
								charts={chartData.holdingsChart.charts}
								valueSymbol={chartData.ticker}
								hideDataZoom={chartData.holdingsChart.dataset.source.length < 2}
								chartOptions={chartOptions}
								onReady={handleChartReady}
							/>
						) : (
							<div className="h-[360px]" />
						)}
					</Suspense>
				</div>
			</div>
			<div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
				{props.mNAVChart != null ? (
					<div className="col-span-1 rounded-md border border-(--cards-border) bg-(--cards-bg) xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<Suspense fallback={<div className="min-h-[398px]" />}>
							<MultiSeriesChart2
								dataset={props.mNAVChart.dataset}
								charts={props.mNAVChart.charts}
								valueSymbol=""
								hideDefaultLegend={false}
								title="mNAV"
								exportButtons={{
									png: true,
									csv: true,
									filename: `${slug(props.name)}-mnav`,
									pngTitle: 'mNAV'
								}}
							/>
						</Suspense>
					</div>
				) : null}
				{props.fdChart != null ? (
					<div className="col-span-1 rounded-md border border-(--cards-border) bg-(--cards-bg) xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<Suspense fallback={<div className="min-h-[398px]" />}>
							<MultiSeriesChart2
								dataset={props.fdChart.dataset}
								charts={props.fdChart.charts}
								valueSymbol=""
								hideDefaultLegend={false}
								title="Fully Diluted Shares"
								exportButtons={{
									png: true,
									csv: true,
									filename: `${slug(props.name)}-fully-diluted-shares`,
									pngTitle: 'Fully Diluted Shares'
								}}
							/>
						</Suspense>
					</div>
				) : null}
				{props.ohlcvChartData != null ? (
					<div className="col-span-full min-h-[480px] rounded-md border border-(--cards-border) bg-(--cards-bg)">
						<h2 className="mr-auto p-2 text-base font-semibold">Share Price</h2>
						<Suspense fallback={<div className="h-[480px]" />}>
							<CandlestickChart data={props.ohlcvChartData} />
						</Suspense>
						<p className="p-2 text-xs text-(--text-disabled)">Source: Yahoo Finance</p>
					</div>
				) : null}
				{props.totalAssetValueChart != null ? (
					<div className="col-span-full rounded-md border border-(--cards-border) bg-(--cards-bg)">
						<Suspense fallback={<div className="min-h-[398px]" />}>
							<MultiSeriesChart2
								dataset={props.totalAssetValueChart.dataset}
								charts={props.totalAssetValueChart.charts}
								valueSymbol="$"
								title="Total Asset Value"
								exportButtons={{
									png: true,
									csv: true,
									filename: `${slug(props.name)}-total-asset-value`,
									pngTitle: 'Total Asset Value'
								}}
							/>
						</Suspense>
					</div>
				) : null}
			</div>
			<TableWithSearch
				data={props.transactions}
				columns={columns}
				placeholder="Search assets"
				columnToSearch="assetName"
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</>
	)
}

type TransactionRow = IDATCompanyPageProps['transactions'][number]

const columns: ColumnDef<TransactionRow>[] = [
	{
		header: 'Asset',
		accessorKey: 'assetName',
		enableSorting: false,
		cell: ({ getValue }) => {
			return <>{getValue<string>()}</>
		}
	},
	{
		header: 'Amount',
		id: 'amount',
		accessorFn: (row) => {
			return row.type === 'sale' ? -Number(row.amount) : Number(row.amount)
		},
		cell: ({ getValue, row }) => {
			const value = getValue<number>()
			return (
				<span className={value < 0 ? 'text-(--error)' : 'text-(--success)'}>
					{`${value < 0 ? '-' : '+'}${formattedNum(Math.abs(value), false)} ${row.original.assetTicker}`}
				</span>
			)
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Avg Purchase Price',
		accessorKey: 'avg_price',
		cell: ({ getValue }) => {
			const v = getValue<string | null>()
			if (v == null) return null
			return <>{formattedNum(v, true)}</>
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'USD Value',
		accessorKey: 'usd_value',
		cell: ({ getValue }) => {
			const v = getValue<string | null>()
			if (v == null) return null
			return <>{formattedNum(v, true)}</>
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Report Date',
		accessorKey: 'report_date',
		cell: ({ getValue }) => {
			const v = getValue<string | null>()
			if (v == null) return null
			return <>{dayjs(v).format('MMM D, YYYY')}</>
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Type',
		accessorKey: 'type',
		cell: ({ getValue }) => {
			return <>{getType(getValue<string>())}</>
		},
		enableSorting: false,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Source Type',
		accessorKey: 'source_type',
		cell: ({ getValue }) => {
			return <>{getSourceType(getValue<string>())}</>
		},
		enableSorting: false,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Source URL',
		accessorKey: 'source_url',
		cell: ({ getValue }) => {
			const url = getValue<string>()
			if (!url) return null

			return (
				<a
					className="flex items-center justify-center gap-4 rounded-md bg-(--btn2-bg) p-1.5 hover:bg-(--btn2-hover-bg)"
					href={url}
					target="_blank"
					rel="noopener noreferrer"
				>
					<Icon name="arrow-up-right" height={14} width={14} />
					<span className="sr-only">open in new tab</span>
				</a>
			)
		},
		enableSorting: false
	},
	{
		header: 'Source Note',
		accessorKey: 'source_note',
		cell: ({ getValue }) => {
			const v = getValue<string>()
			return (
				<Tooltip className="inline overflow-hidden text-ellipsis whitespace-nowrap" content={v}>
					{v}
				</Tooltip>
			)
		},
		enableSorting: false,
		size: 1000
	}
]

/** Narrow an unknown echarts tooltip param to a record, or return undefined. */
function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === 'object' && value != null ? (value as Record<string, unknown>) : undefined
}

const chartOptions = {
	tooltip: {
		formatter: (params: unknown) => {
			const paramsArray = Array.isArray(params) ? params : [params]
			const firstParam = asRecord(paramsArray[0])
			if (!firstParam) return ''
			const data = asRecord(firstParam.data) ?? {}
			const valueArray = Array.isArray(firstParam.value) ? firstParam.value : undefined
			const timestamp = data.timestamp ?? valueArray?.[0] ?? firstParam.axisValue
			const seriesName = typeof firstParam.seriesName === 'string' ? firstParam.seriesName : undefined
			const holdings = (seriesName != null ? data[seriesName] : undefined) ?? valueArray?.[1]
			const deltaRaw = data.delta ?? valueArray?.[2]
			const avgPrice = data.avgPrice ?? valueArray?.[3]
			const usdValue = data.usdValue ?? valueArray?.[4]
			const deltaValue = typeof deltaRaw === 'number' ? deltaRaw : Number(deltaRaw ?? 0)
			const label = deltaValue < 0 ? 'Sold' : 'Purchased'
			const valueLabel = deltaValue < 0 ? 'Sale value' : 'Purchase value'
			const timestampNum =
				typeof timestamp === 'number' ? timestamp : typeof timestamp === 'string' ? Number(timestamp) : undefined
			let val =
				dayjs(timestampNum).format('MMM D, YYYY') +
				'<li style="list-style:none">' +
				`${label}:` +
				'&nbsp;&nbsp;' +
				'<span style="font-weight:600;">' +
				formattedNum(Math.abs(deltaValue), false) +
				'&nbsp;' +
				(seriesName ?? '') +
				'</span>' +
				'</li>'

			if (avgPrice != null) {
				val +=
					'<li style="list-style:none">' +
					`Cost basis per unit:` +
					'&nbsp;&nbsp;' +
					'<span style="font-weight:600;">' +
					formattedNum(Number(avgPrice), true) +
					'</span>' +
					'</li>'
			}

			if (usdValue != null) {
				val +=
					'<li style="list-style:none">' +
					`${valueLabel}:` +
					'&nbsp;&nbsp;' +
					'<span style="font-weight:600;">' +
					formattedNum(Number(usdValue), true) +
					'</span>' +
					'</li>'
			}

			val +=
				'<li style="list-style:none">' +
				`Holdings till date:` +
				'&nbsp;&nbsp;' +
				'<span style="font-weight:600;">' +
				formattedNum(typeof holdings === 'number' ? holdings : Number(holdings ?? 0), false) +
				'&nbsp;' +
				(seriesName ?? '') +
				'</span>' +
				'</li>'
			return val
		}
	}
}
