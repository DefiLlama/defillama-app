import { useQuery } from '@tanstack/react-query'
import { lazy, useEffect, useMemo } from 'react'
import type { IChartProps } from '~/components/ECharts/types'
import { useContentReady } from '~/containers/Investors/index'
import { lastNDaysZoom } from './chartDefaults'
import { chartToData, type UpstreamChart } from './transform'
import { ChartCard, KpiCard, SectionHeader } from './ui'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

interface FormattedValue {
	value: number
	formatted: string
}

interface OverviewAPIResponse {
	tvl: {
		tvlChart: UpstreamChart
		kpis: { currentTvl: FormattedValue }
	}
	stablecoins: {
		stablecoinChart: UpstreamChart
		kpis: {
			currentCirculating: FormattedValue
			currentMinted: FormattedValue
			currentBridged: FormattedValue
		}
	}
}

export default function Overview() {
	const query = useQuery<OverviewAPIResponse>({
		queryKey: ['flare-overview'],
		queryFn: async () => {
			const res = await fetch('/api/flare/overview')
			if (!res.ok) throw new Error(`Flare overview API error: ${res.status}`)
			return res.json()
		},
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	const onContentReady = useContentReady()

	useEffect(() => {
		if (query.data) onContentReady()
	}, [query.data, onContentReady])

	const data = useMemo(() => {
		if (!query.data) return null
		const t = query.data.tvl
		const s = query.data.stablecoins
		const stackSeries = s.stablecoinChart.series.filter((x) => !/total/i.test(x.name))
		return {
			tvl: {
				title: t.tvlChart.title ?? 'Flare TVL',
				chartData: chartToData(t.tvlChart),
				stacks: t.tvlChart.series.map((x) => x.name),
				currentFormatted: t.kpis.currentTvl.formatted
			},
			stables: {
				title: s.stablecoinChart.title ?? 'Stablecoin Supply on Flare',
				chartData: chartToData({ ...s.stablecoinChart, series: stackSeries }),
				stacks: stackSeries.map((x) => x.name),
				kpis: {
					total: s.kpis.currentCirculating,
					native: s.kpis.currentMinted,
					bridged: s.kpis.currentBridged
				}
			}
		}
	}, [query.data])

	if (!data) return null

	const { tvl, stables } = data

	return (
		<div className="flex flex-col gap-6">
			<SectionHeader>Chain Ecosystem</SectionHeader>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<KpiCard label="Chain TVL" value={tvl.currentFormatted} />
				<KpiCard label="Stablecoins (Total)" value={stables.kpis.total.formatted} />
				<KpiCard label="Native Minted" value={stables.kpis.native.formatted} />
				<KpiCard label="Bridged" value={stables.kpis.bridged.formatted} />
			</div>

			<ChartCard title={tvl.title}>
				<AreaChart
					chartData={tvl.chartData}
					stacks={tvl.stacks}
					valueSymbol="$"
					title=""
					height="360px"
					chartOptions={lastNDaysZoom(tvl.chartData.length)}
				/>
			</ChartCard>

			<ChartCard title={stables.title}>
				<AreaChart
					chartData={stables.chartData}
					stacks={stables.stacks}
					valueSymbol="$"
					title=""
					isStackedChart
					hideGradient
					height="360px"
					chartOptions={lastNDaysZoom(stables.chartData.length)}
				/>
			</ChartCard>
		</div>
	)
}
