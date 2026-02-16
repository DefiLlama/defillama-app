import { lazy, useMemo } from 'react'
import type { IBarChartProps } from '~/components/ECharts/types'
import { formattedNum } from '~/utils'
import { useEtherfiCashTransactions } from './cashApi'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

const SCROLL_LEGEND = {
	legend: { type: 'scroll' as const, orient: 'horizontal' as const, top: 0 }
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">{title}</h3>
			{children}
		</div>
	)
}

function CardSkeleton({ title }: { title: string }) {
	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">{title}</h3>
			<div className="flex h-[400px] items-center justify-center">
				<div className="h-5 w-5 animate-spin rounded-full border-2 border-(--text-disabled) border-t-transparent" />
			</div>
		</div>
	)
}

function KpiCard({ label, value }: { label: string; value: string | number | null }) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<span className="text-xs font-medium tracking-wide text-(--text-label)">{label}</span>
			<span className="text-2xl font-semibold text-(--text-primary)">{value ?? '—'}</span>
		</div>
	)
}

function KpiSkeleton({ label }: { label: string }) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<span className="text-xs font-medium tracking-wide text-(--text-label)">{label}</span>
			<div className="h-8 w-24 animate-pulse rounded bg-(--text-disabled) opacity-20" />
		</div>
	)
}

function makeStacks(keys: string[]): Record<string, string> {
	const s: Record<string, string> = {}
	for (const k of keys) s[k] = 'a'
	return s
}

export default function CashTransactions() {
	const { kpis, txnsByClass, usersByClass, txnClasses, colors, weeklyTxns, weeklyUsers, weeklyAvg, isLoading } =
		useEtherfiCashTransactions()

	const classStacks = useMemo(() => makeStacks(txnClasses), [txnClasses])

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
				{kpis ? (
					<>
						<KpiCard label="Txns All Time" value={formattedNum(kpis.allTimeTxns)} />
						<KpiCard label="Active Users All Time" value={formattedNum(kpis.allTimeUsers)} />
						<KpiCard label="Txns per User All Time" value={formattedNum(kpis.allTimeAvg)} />
					</>
				) : (
					<>
						<KpiSkeleton label="Txns All Time" />
						<KpiSkeleton label="Active Users All Time" />
						<KpiSkeleton label="Txns per User All Time" />
					</>
				)}
			</div>

			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
				{kpis ? (
					<>
						<KpiCard label="Txns Last Week" value={formattedNum(kpis.lastWeekTxns)} />
						<KpiCard label="Active Users Last Week" value={formattedNum(kpis.lastWeekUsers)} />
						<KpiCard label="Txns per User Last Week" value={formattedNum(kpis.lastWeekAvg)} />
					</>
				) : (
					<>
						<KpiSkeleton label="Txns Last Week" />
						<KpiSkeleton label="Active Users Last Week" />
						<KpiSkeleton label="Txns per User Last Week" />
					</>
				)}
			</div>

			{isLoading ? (
				<CardSkeleton title="Weekly Transactions by Class" />
			) : (
				<ChartCard title="Weekly Transactions by Class">
					<BarChart
						chartData={txnsByClass}
						stacks={classStacks}
						stackColors={colors}
						title=""
						height="400px"
						chartOptions={SCROLL_LEGEND}
					/>
				</ChartCard>
			)}

			{isLoading ? (
				<CardSkeleton title="Weekly Users by Class" />
			) : (
				<ChartCard title="Weekly Users by Class">
					<BarChart
						chartData={usersByClass}
						stacks={classStacks}
						stackColors={colors}
						title=""
						height="400px"
						chartOptions={SCROLL_LEGEND}
					/>
				</ChartCard>
			)}

			{isLoading ? (
				<CardSkeleton title="Weekly Transactions" />
			) : (
				<ChartCard title="Weekly Transactions">
					<BarChart
						chartData={weeklyTxns}
						stacks={{ Transactions: 'a' }}
						stackColors={{ Transactions: '#4FC3F7' }}
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{isLoading ? (
				<CardSkeleton title="Weekly Active Users" />
			) : (
				<ChartCard title="Weekly Active Users">
					<BarChart
						chartData={weeklyUsers}
						stacks={{ 'Active Users': 'a' }}
						stackColors={{ 'Active Users': '#66BB6A' }}
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{isLoading ? (
				<CardSkeleton title="Weekly Average Txns per User" />
			) : (
				<ChartCard title="Weekly Average Txns per User">
					<BarChart
						chartData={weeklyAvg}
						stacks={{ 'Avg Txns per User': 'a' }}
						stackColors={{ 'Avg Txns per User': '#AB47BC' }}
						title=""
						height="400px"
					/>
				</ChartCard>
			)}
		</div>
	)
}
