import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { formatTooltipChartDate, formatTooltipValue } from '~/components/ECharts/formatters'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { NftsMarketplaceTable } from '~/components/Table/Nfts/Marketplaces'
import { TagGroup } from '~/components/TagGroup'
import { getNFTMarketplacesData } from '~/containers/Nft/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const MultiSeriesChart2 = React.lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

export const getStaticProps = withPerformanceLogging('nfts/marketplaces', async () => {
	const data = await getNFTMarketplacesData()

	return {
		props: {
			...data
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Volume', 'by', 'NFT Marketplaces']

const VIEW_TYPES = ['Absolute', 'Relative'] as const
type ViewType = (typeof VIEW_TYPES)[number]

type LegacyRow = { date: string | number } & Record<string, any>

function buildDataset(rows: LegacyRow[], seriesNames: string[]): MultiSeriesChart2Dataset {
	const source = (rows ?? [])
		.map((row) => {
			const sec = typeof row.date === 'string' ? Number(row.date) : Number(row.date)
			const timestamp = Number.isFinite(sec) ? sec * 1e3 : Number.NaN
			if (!Number.isFinite(timestamp)) return null

			const out: Record<string, number> = { timestamp }
			for (const name of seriesNames) {
				const raw = row[name]
				const value = typeof raw === 'number' ? raw : Number(raw ?? 0)
				out[name] = Number.isFinite(value) ? value : 0
			}
			return out
		})
		.filter(Boolean)

	return { source: source as any[], dimensions: ['timestamp', ...seriesNames] }
}

function createMarketplacesTooltipFormatter({
	valueSymbol,
	tooltipOrderBottomUp
}: {
	valueSymbol: string
	tooltipOrderBottomUp: boolean
}) {
	return (params: any) => {
		const items = Array.isArray(params) ? params : params ? [params] : []
		if (items.length === 0) return ''

		const first = items[0]
		const row =
			first?.data && typeof first.data === 'object' && !Array.isArray(first.data)
				? (first.data as Record<string, any>)
				: null
		const axisValue = row?.timestamp ?? first?.axisValue ?? (Array.isArray(first?.value) ? first.value[0] : undefined)
		const ts = typeof axisValue === 'number' ? axisValue : Number(axisValue)
		const chartdate = Number.isFinite(ts) ? formatTooltipChartDate(ts, 'daily') : ''

		let filtered = items
			.map((item: any) => {
				const name = item?.seriesName
				if (!name) return null
				const r =
					item?.data && typeof item.data === 'object' && !Array.isArray(item.data)
						? (item.data as Record<string, any>)
						: null
				const raw = r && name in r ? r[name] : Array.isArray(item?.value) ? item.value[1] : item?.value
				const value = raw === '-' || raw == null ? null : typeof raw === 'number' ? raw : Number(raw)
				if (value == null || Number.isNaN(value)) return null
				return { marker: item.marker, seriesName: name, value }
			})
			.filter(Boolean)

		// Match legacy useDefaults: sort by abs(desc), keep top 10, then aggregate the rest into "Others".
		filtered.sort((a: any, b: any) => Math.abs(b.value) - Math.abs(a.value))

		const otherIndex = filtered.findIndex((item: any) => item.seriesName === 'Others')
		let othersFromData: any = null
		if (otherIndex >= 0 && otherIndex < 10) {
			othersFromData = filtered[otherIndex]
			filtered = filtered.filter((item: any) => item.seriesName !== 'Others')
		}

		const topParams = filtered.slice(0, 10)
		const otherParams = filtered.slice(10)

		if (tooltipOrderBottomUp) {
			topParams.reverse()
		}

		let vals = topParams.reduce((prev: string, curr: any) => {
			return (
				prev +
				`<li style="list-style:none;">${curr.marker} ${curr.seriesName}: ${formatTooltipValue(curr.value, valueSymbol)}</li>`
			)
		}, '')

		if (otherParams.length !== 0) {
			const otherSum =
				otherParams.reduce((prev: number, curr: any) => prev + (typeof curr.value === 'number' ? curr.value : 0), 0) +
				(othersFromData?.value ?? 0)
			const otherMarker = othersFromData?.marker ?? otherParams[0]?.marker ?? ''
			const otherString = `<li style="list-style:none;">${otherMarker} Others: ${formatTooltipValue(otherSum, valueSymbol)}</li>`
			vals = tooltipOrderBottomUp ? otherString + vals : vals + otherString
		}

		return chartdate + vals
	}
}

function Marketplaces({ data, volume, dominance, trades, dominanceTrade, marketplaces, stackColors }) {
	const [viewType, setViewType] = React.useState<ViewType>('Absolute')

	const {
		absoluteVolumeDataset,
		relativeVolumeDataset,
		absoluteTradesDataset,
		relativeTradesDataset,
		absoluteBarCharts,
		relativeAreaCharts
	} = React.useMemo(() => {
		const seriesNames = marketplaces ?? []

		const absoluteVolumeDataset = buildDataset(volume ?? [], seriesNames)
		const absoluteTradesDataset = buildDataset(trades ?? [], seriesNames)
		const relativeVolumeDataset = buildDataset(dominance ?? [], seriesNames)
		const relativeTradesDataset = buildDataset(dominanceTrade ?? [], seriesNames)

		const absoluteBarCharts: IMultiSeriesChart2Props['charts'] = seriesNames.map((name) => ({
			type: 'bar' as const,
			name,
			encode: { x: 'timestamp', y: name },
			stack: 'stackA',
			color: stackColors?.[name]
		}))

		const relativeAreaCharts: IMultiSeriesChart2Props['charts'] = seriesNames.map((name) => ({
			type: 'line' as const,
			name,
			encode: { x: 'timestamp', y: name },
			color: stackColors?.[name]
		}))

		return {
			absoluteVolumeDataset,
			relativeVolumeDataset,
			absoluteTradesDataset,
			relativeTradesDataset,
			absoluteBarCharts,
			relativeAreaCharts
		}
	}, [marketplaces, volume, trades, dominance, dominanceTrade, stackColors])

	const volumeChartOptions = React.useMemo(() => {
		const valueSymbol = viewType === 'Relative' ? '%' : 'ETH'
		return {
			tooltip: {
				formatter: createMarketplacesTooltipFormatter({
					valueSymbol,
					tooltipOrderBottomUp: false
				})
			}
		}
	}, [viewType])

	const tradesChartOptions = React.useMemo(() => {
		const valueSymbol = viewType === 'Relative' ? '%' : ''
		return {
			tooltip: {
				formatter: createMarketplacesTooltipFormatter({
					valueSymbol,
					tooltipOrderBottomUp: false
				})
			}
		}
	}, [viewType])

	return (
		<Layout
			title="NFT Marketplaces - DefiLlama"
			description={`NFT Marketplaces by Volume. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`nft marketplaces by volume, defi nft marketplaces`}
			canonicalUrl={`/nfts/marketplaces`}
			pageName={pageName}
		>
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex items-center justify-between gap-2 p-2">
					<TagGroup
						selectedValue={viewType}
						setValue={(period) => setViewType(period as ViewType)}
						values={VIEW_TYPES}
						className="ml-auto"
					/>
				</div>
				<div className="grid grid-cols-1 *:col-span-1 xl:min-h-[398px] xl:grid-cols-2">
					<React.Suspense fallback={<div className="h-[398px] w-full" />}>
						<MultiSeriesChart2
							title="Volume"
							dataset={viewType === 'Relative' ? relativeVolumeDataset : absoluteVolumeDataset}
							charts={viewType === 'Relative' ? relativeAreaCharts : absoluteBarCharts}
							stacked={viewType === 'Relative'}
							expandTo100Percent={viewType === 'Relative'}
							valueSymbol={viewType === 'Relative' ? '%' : 'ETH'}
							hideDefaultLegend
							chartOptions={volumeChartOptions}
							shouldEnableCSVDownload
							shouldEnableImageExport
							imageExportFilename={`nft-marketplaces-volume-${viewType.toLowerCase()}`}
							imageExportTitle={`NFT Marketplaces Volume (${viewType})`}
						/>
					</React.Suspense>

					<React.Suspense fallback={<div className="h-[398px] w-full" />}>
						<MultiSeriesChart2
							title="Trades"
							dataset={viewType === 'Relative' ? relativeTradesDataset : absoluteTradesDataset}
							charts={viewType === 'Relative' ? relativeAreaCharts : absoluteBarCharts}
							stacked={viewType === 'Relative'}
							expandTo100Percent={viewType === 'Relative'}
							valueSymbol={viewType === 'Relative' ? '%' : ''}
							hideDefaultLegend
							chartOptions={tradesChartOptions}
							shouldEnableCSVDownload
							shouldEnableImageExport
							imageExportFilename={`nft-marketplaces-trades-${viewType.toLowerCase()}`}
							imageExportTitle={`NFT Marketplaces Trades (${viewType})`}
						/>
					</React.Suspense>
				</div>
				<NftsMarketplaceTable data={data} />
			</div>
		</Layout>
	)
}

export default Marketplaces
