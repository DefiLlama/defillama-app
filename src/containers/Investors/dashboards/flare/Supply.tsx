import { useQuery } from '@tanstack/react-query'
import { lazy, useEffect, useMemo } from 'react'
import type { IChartProps } from '~/components/ECharts/types'
import { useContentReady } from '~/containers/Investors/index'
import { chartToData, parseDateToUnix, type UpstreamChart } from './transform'
import { ChartCard, KpiCard, SectionHeader } from './ui'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

interface FormattedValue {
	value: number
	formatted: string
	date?: string
}

interface SupplyAPIResponse {
	unlockSchedule: UpstreamChart & { splitDate?: string; categories?: string[] }
	supplyMetrics?: {
		maxSupply?: FormattedValue
		incentiveAmount?: FormattedValue
		nonIncentiveAmount?: FormattedValue
	}
	kpis: {
		price?: FormattedValue
		priceChange24h?: FormattedValue
		marketCap?: FormattedValue
		fdv?: FormattedValue
		ath?: FormattedValue
		circulatingSupply?: FormattedValue
		cgCirculatingSupply?: FormattedValue
		currentTotalUnlocked?: FormattedValue
		cumulativeBurned?: FormattedValue
		maxSupply?: FormattedValue
	}
}

export default function Supply() {
	const query = useQuery<SupplyAPIResponse>({
		queryKey: ['flare-supply'],
		queryFn: async () => {
			const res = await fetch('/api/flare/supply')
			if (!res.ok) throw new Error(`Flare supply API error: ${res.status}`)
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
		const u = query.data.unlockSchedule
		const splitUnix = u.splitDate ? parseDateToUnix(u.splitDate) : 0
		return {
			unlockTitle: u.title ?? 'FLR Unlock Schedule (Genesis → 2031)',
			unlockData: chartToData(u),
			unlockStacks: u.series.map((s) => s.name),
			todayUnix: splitUnix,
			supplyMetrics: query.data.supplyMetrics,
			kpis: query.data.kpis
		}
	}, [query.data])

	if (!data) return null

	const k = data.kpis
	const sm = data.supplyMetrics
	const circulating = k.circulatingSupply ?? k.cgCirculatingSupply

	return (
		<div className="flex flex-col gap-6">
			<SectionHeader>Market & Supply</SectionHeader>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				{k.price && (
					<KpiCard
						label="FLR Price"
						value={k.price.formatted}
						change={k.priceChange24h ? { value: k.priceChange24h.value, formatted: k.priceChange24h.formatted } : undefined}
					/>
				)}
				{k.marketCap && <KpiCard label="Market Cap" value={k.marketCap.formatted} />}
				{k.fdv && <KpiCard label="FDV" value={k.fdv.formatted} />}
				{k.ath && <KpiCard label="ATH" value={k.ath.formatted} sub={k.ath.date} />}
			</div>

			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				{circulating && <KpiCard label="Circulating Supply" value={circulating.formatted} />}
				{k.currentTotalUnlocked && <KpiCard label="Total Unlocked" value={k.currentTotalUnlocked.formatted} />}
				{k.cumulativeBurned && <KpiCard label="Cumulative Burned" value={k.cumulativeBurned.formatted} />}
				{k.maxSupply && <KpiCard label="Max Supply" value={k.maxSupply.formatted} />}
			</div>

			{sm && (sm.incentiveAmount || sm.nonIncentiveAmount) && (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{sm.incentiveAmount && <KpiCard label="Incentive Pool" value={sm.incentiveAmount.formatted} />}
					{sm.nonIncentiveAmount && <KpiCard label="Non-Incentive" value={sm.nonIncentiveAmount.formatted} />}
				</div>
			)}

			<SectionHeader>Unlock Schedule (Genesis → 2031)</SectionHeader>
			<ChartCard title={data.unlockTitle}>
				<AreaChart
					chartData={data.unlockData}
					stacks={data.unlockStacks}
					valueSymbol=""
					customLegendName="FLR"
					title=""
					isStackedChart
					hideGradient
					height="460px"
					hallmarks={data.todayUnix > 0 ? [[data.todayUnix, 'Today']] : undefined}
				/>
			</ChartCard>
		</div>
	)
}
