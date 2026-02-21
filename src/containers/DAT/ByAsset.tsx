import type { ColumnDef } from '@tanstack/react-table'
import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { createInflowsTooltipFormatter } from '~/components/ECharts/formatters'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { Tooltip } from '~/components/Tooltip'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { formattedNum, slug } from '~/utils'
import type { IDATOverviewDataByAssetProps } from './types'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const DEFAULT_SORTING_STATE = [{ id: 'totalAssetAmount', desc: true }]

function prepareAssetBreakdownCsv(
	institutions: IDATOverviewDataByAssetProps['institutions'],
	name: string,
	symbol: string
) {
	const headers = [
		'Institution',
		'Ticker',
		'Type',
		`Holdings (${symbol})`,
		"Today's Holdings Value",
		'Stock Price',
		'24h Price Change (%)',
		`% of ${symbol} Circulating Supply`,
		'Realized mNAV',
		'Realistic mNAV',
		'Max mNAV',
		`Average Purchase Price (${symbol})`,
		'Last Updated'
	]

	const rows = institutions.map((institution) => {
		return [
			institution.name,
			institution.ticker,
			institution.type,
			institution.holdings.amount ?? '',
			institution.holdings.usdValue ?? '',
			institution.price ?? '',
			institution.priceChange24h ?? '',
			institution.holdings.supplyPercentage ?? '',
			institution.realized_mNAV ?? '',
			institution.realistic_mNAV ?? '',
			institution.max_mNAV ?? '',
			institution.holdings.avgPrice ?? '',
			institution.holdings.lastAnnouncementDate
				? new Date(institution.holdings.lastAnnouncementDate).toLocaleDateString()
				: ''
		]
	})

	const date = new Date().toISOString().split('T')[0]
	return {
		filename: `${name.toLowerCase().replace(/\s+/g, '-')}-treasury-holdings-${date}.csv`,
		rows: [headers, ...rows]
	}
}

export function DATByAsset({
	allAssets,
	metadata,
	dailyFlowsChart,
	institutions,
	mNAVRealizedChart,
	mNAVRealisticChart,
	mNAVMaxChart,
	institutionsNames
}: IDATOverviewDataByAssetProps) {
	const handlePrepareAssetBreakdownCsv = useCallback(
		() => prepareAssetBreakdownCsv(institutions, metadata.name, metadata.ticker),
		[institutions, metadata.name, metadata.ticker]
	)
	const inflowsTooltipFormatter = useMemo(
		() => createInflowsTooltipFormatter({ groupBy: 'daily', valueSymbol: metadata.ticker }),
		[metadata.ticker]
	)
	const columns = useMemo(() => byAssetColumns({ symbol: metadata.ticker }), [metadata.ticker])
	const stableInstitutionsKey = useMemo(() => JSON.stringify([...institutionsNames].sort()), [institutionsNames])

	return (
		<>
			<RowLinksWithDropdown links={allAssets} activeLink={metadata.name} />
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:col-span-1">
					<Tooltip
						render={<h1 />}
						content={`Institutions that own ${metadata.name} as part of their corporate treasury`}
						className="text-xl font-semibold"
					>
						{metadata.name} Treasury Holdings
					</Tooltip>
					<div className="flex flex-col">
						<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
							<span className="text-(--text-label)">Total Institution</span>
							<span className="ml-auto font-jetbrains">{metadata.companies}</span>
						</p>
						<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
							<span className="text-(--text-label)">Total Holdings</span>
							<span className="ml-auto font-jetbrains">{`${formattedNum(metadata.totalAmount, false)} ${metadata.ticker}`}</span>
						</p>
						<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
							<span className="text-(--text-label)">Total USD Value</span>
							<span className="ml-auto font-jetbrains">{formattedNum(metadata.totalUsdValue, true)}</span>
						</p>
						{metadata.circSupplyPerc != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<span className="text-(--text-label)">% of {metadata.ticker} Circulating Supply</span>
								<span className="ml-auto font-jetbrains">
									{metadata.circSupplyPerc.toLocaleString(undefined, { maximumFractionDigits: 3 })}%
								</span>
							</p>
						) : null}
					</div>
					<BasicLink href="/report-error" className="mt-auto mr-auto pt-4 text-left text-(--text-form) underline">
						Report incorrect data
					</BasicLink>
				</div>
				<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<Suspense fallback={<div className="min-h-[398px]" />}>
						<MultiSeriesChart2
							dataset={dailyFlowsChart.dataset}
							charts={dailyFlowsChart.charts}
							valueSymbol={metadata.ticker}
							chartOptions={
								(dailyFlowsChart.charts?.length ?? 0) > 1
									? { tooltip: { formatter: inflowsTooltipFormatter } }
									: undefined
							}
							hideDataZoom={dailyFlowsChart.dataset.source.length < 2}
							title="Inflows"
							exportButtons="auto"
						/>
					</Suspense>
				</div>
			</div>
			<div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
				<MNAVChart
					key={`realized-${stableInstitutionsKey}`}
					metadata={metadata}
					title="mNAV Realized"
					data={mNAVRealizedChart}
					institutionsNames={institutionsNames}
				/>
				<MNAVChart
					key={`realistic-${stableInstitutionsKey}`}
					metadata={metadata}
					title="mNAV Realistic"
					data={mNAVRealisticChart}
					institutionsNames={institutionsNames}
				/>
				<MNAVChart
					key={`max-${stableInstitutionsKey}`}
					metadata={metadata}
					title="mNAV Max"
					data={mNAVMaxChart}
					institutionsNames={institutionsNames}
				/>
			</div>
			<TableWithSearch
				data={institutions}
				columns={columns}
				placeholder="Search institutions"
				columnToSearch="name"
				sortingState={DEFAULT_SORTING_STATE}
				customFilters={<CSVDownloadButton prepareCsv={handlePrepareAssetBreakdownCsv} />}
			/>
		</>
	)
}

// ── Table columns ───────────────────────────────────────────────────────

function byAssetColumns({
	symbol
}: {
	symbol: string
}): ColumnDef<IDATOverviewDataByAssetProps['institutions'][number]>[] {
	return [
		{
			header: 'Institution',
			accessorKey: 'name',
			enableSorting: false,
			cell: ({ getValue, row }) => {
				const name = getValue<string>()

				return (
					<span className="relative flex items-center gap-2">
						<span className="vf-row-index shrink-0" aria-hidden="true" />
						<BasicLink
							href={`/digital-asset-treasury/${slug(row.original.ticker)}`}
							title={name}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
						>
							{name}
						</BasicLink>
					</span>
				)
			},
			size: 228,
			meta: {
				align: 'start'
			}
		},
		{
			header: 'Holdings',
			id: 'totalAssetAmount',
			accessorFn: (row) => row.holdings.amount,
			cell: ({ getValue }) => {
				const totalAssetAmount = getValue<number>()
				if (totalAssetAmount == null) return null
				return <>{`${formattedNum(totalAssetAmount, false)} ${symbol}`}</>
			},
			size: 120,
			meta: {
				align: 'end'
			}
		},
		{
			header: "Today's Holdings Value",
			id: 'totalUsdValue',
			accessorFn: (row) => row.holdings.usdValue,
			cell: ({ getValue }) => {
				const usdValue = getValue<number>()
				if (usdValue == null) return null
				return <>{formattedNum(usdValue, true)}</>
			},
			size: 196,
			meta: {
				align: 'end'
			}
		},
		{
			header: 'Stock Price',
			accessorKey: 'price',
			cell: ({ getValue, row }) => {
				const price = getValue<number>()
				if (price == null) return null
				const priceChange24h = row.original.priceChange24h
				if (priceChange24h == null) return <>{formattedNum(price, true)}</>
				return (
					<Tooltip
						content={
							<>
								24h change:{' '}
								<span
									className={priceChange24h > 0 ? 'text-(--success)' : priceChange24h < 0 ? 'text-(--error)' : ''}
								>{`${priceChange24h > 0 ? '+' : ''}${priceChange24h.toFixed(2)}%`}</span>
							</>
						}
						className="justify-end underline decoration-dotted"
					>
						{formattedNum(price, true)}
					</Tooltip>
				)
			},
			size: 120,
			meta: {
				align: 'end'
			}
		},
		{
			header: `% of ${symbol} Circulating Supply`,
			id: 'supplyPercentage',
			accessorFn: (row) => row.holdings.supplyPercentage,
			cell: ({ getValue }) => {
				const supplyPercentage = getValue<number>()
				if (supplyPercentage == null) return null
				return <>{formattedNum(supplyPercentage, false)}%</>
			},
			size: 228,
			meta: {
				align: 'end'
			}
		},
		{
			header: 'Realized mNAV',
			accessorKey: 'realized_mNAV',
			cell: ({ getValue }) => {
				const realized_mNAV = getValue<number>()
				if (realized_mNAV == null) return null
				return <>{formattedNum(realized_mNAV, false)}</>
			},
			size: 140,
			meta: {
				align: 'end',
				headerHelperText:
					'Market Net Asset Value based only on the current outstanding common shares, with no dilution considered.'
			}
		},
		{
			header: 'Realistic mNAV',
			accessorKey: 'realistic_mNAV',
			cell: ({ getValue }) => {
				const realistic_mNAV = getValue<number>()
				if (realistic_mNAV == null) return null
				return <>{formattedNum(realistic_mNAV, false)}</>
			},
			size: 140,
			meta: {
				align: 'end',
				headerHelperText:
					'Market Net Asset Value adjusted for expected dilution from in-the-money options and convertibles that are likely to be exercised'
			}
		},
		{
			header: 'Max mNAV',
			accessorKey: 'max_mNAV',
			cell: ({ getValue }) => {
				const max_mNAV = getValue<number>()
				if (max_mNAV == null) return null
				return <>{formattedNum(max_mNAV, false)}</>
			},
			size: 120,
			meta: {
				align: 'end',
				headerHelperText:
					'Market Net Asset Value under the fully diluted scenario, assuming every warrant, option, and convertible is exercised (the most conservative/worst-case view)'
			}
		},
		{
			header: 'Avg Purchase Price',
			id: 'avgPrice',
			accessorFn: (row) => row.holdings.avgPrice,
			cell: ({ getValue }) => {
				const avgPrice = getValue<number>()
				if (avgPrice == null) return null
				return <>{formattedNum(avgPrice, true)}</>
			},
			size: 168,
			meta: {
				align: 'end',
				headerHelperText: `Average cost per ${symbol} of the institution's holdings`
			}
		},
		{
			header: 'Last Updated',
			id: 'lastAnnouncementDate',
			accessorFn: (row) => row.holdings.lastAnnouncementDate,
			cell: ({ getValue }) => {
				const lastUpdated = getValue<string>()
				if (lastUpdated == null) return null
				return <>{new Date(lastUpdated).toLocaleDateString()}</>
			},
			size: 120,
			meta: {
				align: 'end',
				headerHelperText:
					'Some companies do not update their holdings frequently, so the last announcement date may not be the most recent'
			}
		}
	]
}

// ── mNAV chart sub-component ────────────────────────────────────────────

function MNAVChart({
	title,
	data,
	institutionsNames,
	metadata
}: {
	title: string
	data: IDATOverviewDataByAssetProps['mNAVRealizedChart']
	institutionsNames: string[]
	metadata: IDATOverviewDataByAssetProps['metadata']
}) {
	const [selectedInstitution, setSelectedInstitution] = useState<string[]>(institutionsNames)

	const selectedCharts = useMemo(() => {
		return new Set(selectedInstitution)
	}, [selectedInstitution])

	const { chartInstance, handleChartReady } = useGetChartInstance()

	return (
		<div className="col-span-1 rounded-md border border-(--cards-border) bg-(--cards-bg) xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex items-center justify-end gap-2 p-2 pb-0">
				<h2 className="mr-auto text-base font-semibold">{title}</h2>
				<SelectWithCombobox
					allValues={institutionsNames}
					selectedValues={selectedInstitution}
					setSelectedValues={setSelectedInstitution}
					label="Institutions"
					labelType="smol"
					variant="filter"
					portal
				/>
				<ChartExportButtons
					chartInstance={chartInstance}
					filename={`${slug(metadata.name)}-${slug(title)}`}
					title={`${metadata.name} ${title}`}
				/>
			</div>
			<Suspense fallback={<div className="min-h-[360px]" />}>
				<MultiSeriesChart2
					charts={data.charts}
					selectedCharts={selectedCharts}
					dataset={data.dataset}
					valueSymbol=""
					hideDataZoom={data.dataset.source.length < 2}
					onReady={handleChartReady}
				/>
			</Suspense>
		</div>
	)
}
