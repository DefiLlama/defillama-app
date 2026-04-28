import { useQuery } from '@tanstack/react-query'
import { lazy, useEffect, useMemo, useState } from 'react'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { useContentReady } from '~/containers/Investors/index'
import { FLARE_BLUE, FLARE_ORANGE, FLARE_PINK, lastNDaysZoom } from './chartDefaults'
import { chartToData, type UpstreamChart } from './transform'
import { ChartCard, KpiCard, SectionHeader } from './ui'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>
const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

interface FormattedValue {
	value: number
	formatted: string
}

interface TokenomicsAPIResponse {
	burn: {
		burnChart: UpstreamChart
		perTxChart: UpstreamChart
		firePool: { status: string; note: string; burnDestination: string }
		kpis: {
			latestDailyBurn: FormattedValue
			burn7d: FormattedValue
			burn30d: FormattedValue
			burnYtd: FormattedValue
			totalGasBurned: FormattedValue
			latestPerTx: FormattedValue
			avgPerTxAllTime: FormattedValue
		}
	}
	emissions: {
		emissionsChart: UpstreamChart
		burnVsEmitChart: UpstreamChart
		kpis: {
			latestEpochEmit: FormattedValue
			latestEpochBurn: FormattedValue
			latestNetInflation: FormattedValue
			latestBurnVsEmitPct: FormattedValue
			emit30d: FormattedValue
			burn30d: FormattedValue
			netInflation30d: FormattedValue
			burnVsEmit30dPct: FormattedValue
			cumulativeEmissionsTracked: FormattedValue
			epochsTracked: FormattedValue
		}
		note?: string
	}
}

type BurnView = 'daily' | 'cumulative'

function ToggleButton({
	active,
	onClick,
	children
}: {
	active: boolean
	onClick: () => void
	children: React.ReactNode
}) {
	return (
		<button
			onClick={onClick}
			className={`rounded-md px-3 py-1 text-xs font-semibold tracking-wide transition-colors ${
				active
					? 'bg-(--sl-accent-muted) text-(--sl-accent)'
					: 'text-(--text-secondary) hover:bg-(--sl-hover-bg) hover:text-(--text-primary)'
			}`}
		>
			{children}
		</button>
	)
}

export default function Tokenomics() {
	const query = useQuery<TokenomicsAPIResponse>({
		queryKey: ['flare-tokenomics'],
		queryFn: async () => {
			const res = await fetch('/api/flare/tokenomics')
			if (!res.ok) throw new Error(`Flare tokenomics API error: ${res.status}`)
			return res.json()
		},
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	const onContentReady = useContentReady()
	const [burnView, setBurnView] = useState<BurnView>('daily')

	useEffect(() => {
		if (query.data) onContentReady()
	}, [query.data, onContentReady])

	const data = useMemo(() => {
		if (!query.data) return null
		const b = query.data.burn
		const e = query.data.emissions
		return {
			burn: {
				burnTitle: b.burnChart.title ?? 'FLR Burned (Daily Gas)',
				perTxTitle: b.perTxChart.title ?? 'Average Burn per Transaction',
				dailyData: chartToData({
					...b.burnChart,
					series: b.burnChart.series.filter((s) => s.name === 'Daily Burn')
				}),
				cumulativeData: chartToData({
					...b.burnChart,
					series: b.burnChart.series.filter((s) => s.name === 'Cumulative Burn')
				}),
				avgTxFeeData: chartToData(b.perTxChart),
				kpis: b.kpis,
				firePool: b.firePool
			},
			emissions: {
				emissionsTitle: e.emissionsChart.title ?? 'FLR Emissions per Epoch',
				burnVsEmitTitle: e.burnVsEmitChart.title ?? 'Burn vs. Emit',
				burnVsEmitSubtitle: e.burnVsEmitChart.subtitle,
				perEpochData: chartToData({
					...e.emissionsChart,
					series: e.emissionsChart.series.filter((s) => s.name === 'Per Epoch')
				}),
				burnVsEmitData: chartToData(e.burnVsEmitChart),
				kpis: e.kpis
			}
		}
	}, [query.data])

	if (!data) return null

	const { burn: b, emissions: e } = data
	const bk = b.kpis
	const ek = e.kpis

	return (
		<div className="flex flex-col gap-6">
			<SectionHeader>FLR Burn</SectionHeader>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
				<KpiCard label="Latest Daily" value={bk.latestDailyBurn.formatted} />
				<KpiCard label="Burn 7d" value={bk.burn7d.formatted} />
				<KpiCard label="Burn 30d" value={bk.burn30d.formatted} />
				<KpiCard label="Burn YTD" value={bk.burnYtd.formatted} />
				<KpiCard label="Total Burned" value={bk.totalGasBurned.formatted} />
			</div>

			<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
				<div className="mb-3 flex items-center justify-between">
					<h3 className="text-sm font-medium text-(--text-label)">{b.burnTitle}</h3>
					<div className="flex gap-1 rounded-md border border-(--cards-border) p-0.5">
						<ToggleButton active={burnView === 'daily'} onClick={() => setBurnView('daily')}>
							Daily
						</ToggleButton>
						<ToggleButton active={burnView === 'cumulative'} onClick={() => setBurnView('cumulative')}>
							Cumulative
						</ToggleButton>
					</div>
				</div>
				{burnView === 'daily' ? (
					<BarChart
						chartData={b.dailyData}
						stacks={{ 'Daily Burn': 'a' }}
						stackColors={{ 'Daily Burn': FLARE_ORANGE }}
						title=""
						height="360px"
						chartOptions={lastNDaysZoom(b.dailyData.length)}
					/>
				) : (
					<AreaChart
						chartData={b.cumulativeData}
						stacks={['Cumulative Burn']}
						stackColors={{ 'Cumulative Burn': FLARE_PINK }}
						title=""
						height="360px"
						chartOptions={lastNDaysZoom(b.cumulativeData.length)}
					/>
				)}
			</div>

			<SectionHeader>Burn per Transaction</SectionHeader>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<KpiCard label="Latest" value={bk.latestPerTx.formatted} />
				<KpiCard label="All-Time Avg" value={bk.avgPerTxAllTime.formatted} />
			</div>
			<ChartCard title={b.perTxTitle}>
				<AreaChart
					chartData={b.avgTxFeeData}
					stacks={['Avg FLR per Tx']}
					stackColors={{ 'Avg FLR per Tx': FLARE_ORANGE }}
					title=""
					height="320px"
					chartOptions={lastNDaysZoom(b.avgTxFeeData.length)}
				/>
			</ChartCard>

			<SectionHeader>FLR Emissions</SectionHeader>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
				<KpiCard label="Latest Epoch Emit" value={ek.latestEpochEmit.formatted} />
				<KpiCard label="Emit 30d" value={ek.emit30d.formatted} />
				<KpiCard label="Cumulative Emitted" value={ek.cumulativeEmissionsTracked.formatted} />
				<KpiCard label="Epochs Tracked" value={ek.epochsTracked.formatted} />
				<KpiCard label="Latest Epoch Burn" value={ek.latestEpochBurn.formatted} />
			</div>
			<ChartCard title={e.emissionsTitle}>
				<BarChart
					chartData={e.perEpochData}
					stacks={{ 'Per Epoch': 'a' }}
					stackColors={{ 'Per Epoch': FLARE_BLUE }}
					title=""
					height="360px"
					chartOptions={lastNDaysZoom(e.perEpochData.length)}
				/>
			</ChartCard>

			<SectionHeader>Burn vs. Emit & Net Inflation</SectionHeader>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<KpiCard label="Burn / Emit (latest)" value={ek.latestBurnVsEmitPct.formatted} />
				<KpiCard label="Net Inflation (latest)" value={ek.latestNetInflation.formatted} />
				<KpiCard label="Burn / Emit (30d)" value={ek.burnVsEmit30dPct.formatted} />
				<KpiCard label="Net Inflation (30d)" value={ek.netInflation30d.formatted} />
			</div>
			<ChartCard title={e.burnVsEmitTitle}>
				<BarChart
					chartData={e.burnVsEmitData}
					stacks={{
						'FLR Emitted': 'a',
						'FLR Burned': 'b',
						'Net Inflation': 'c'
					}}
					stackColors={{
						'FLR Emitted': FLARE_BLUE,
						'FLR Burned': FLARE_ORANGE,
						'Net Inflation': FLARE_PINK
					}}
					title=""
					height="400px"
					chartOptions={lastNDaysZoom(e.burnVsEmitData.length)}
				/>
			</ChartCard>
			{e.burnVsEmitSubtitle && (
				<p className="text-xs leading-relaxed text-(--text-label)">{e.burnVsEmitSubtitle}</p>
			)}

			<SectionHeader>FIRE Pool (FIP.16)</SectionHeader>
			<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-5">
				<div className="flex items-center gap-2">
					<span className="rounded-full border border-(--cards-border) bg-(--sl-btn-inactive-bg) px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-(--text-secondary) uppercase">
						Coming Soon
					</span>
					<span className="text-sm font-medium text-(--text-primary)">FIRE pool balance & burns</span>
				</div>
				<p className="mt-3 text-xs leading-relaxed text-(--text-label)">{b.firePool.note}</p>
			</div>
		</div>
	)
}
