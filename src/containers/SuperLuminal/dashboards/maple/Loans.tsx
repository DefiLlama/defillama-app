import { getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { lazy, useMemo, useState } from 'react'
import type { IBarChartProps } from '~/components/ECharts/types'
import { VirtualTable } from '~/components/Table/Table'
import { formattedNum } from '~/utils'
import { useMaplePoolsWithLoans, parseInterestRate, parseTokenAmount } from './api'
import { ChartCard, CardSkeleton, KpiCard, KpiSkeleton, Pagination, formatPct } from './shared'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

interface LoanRow {
	id: string
	borrower: string
	pool: string
	asset: string
	principal: number
	interestRate: number
	isCalled: boolean
	isImpaired: boolean
	interestPaid: number
	fundingDate: number
	ageDays: number
	state: string
	paymentIntervalDays: number
}

const loanColumns: ColumnDef<LoanRow>[] = [
	{
		header: 'Borrower',
		accessorKey: 'borrower',
		cell: ({ getValue }) => {
			const addr = getValue<string>()
			return `${addr.slice(0, 6)}...${addr.slice(-4)}`
		},
		size: 130
	},
	{ header: 'Pool', accessorKey: 'pool', size: 180 },
	{
		header: 'Principal',
		accessorKey: 'principal',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 130
	},
	{
		header: 'Rate',
		accessorKey: 'interestRate',
		cell: ({ getValue }) => formatPct(getValue<number>()),
		meta: { align: 'end' as const },
		size: 80
	},
	{
		header: 'State',
		accessorKey: 'state',
		size: 80
	},
	{
		header: 'Age',
		accessorKey: 'ageDays',
		cell: ({ getValue }) => {
			const days = getValue<number>()
			if (days <= 0) return '< 1d'
			if (days < 30) return `${days}d`
			return `${Math.floor(days / 30)}mo`
		},
		meta: { align: 'end' as const },
		size: 70
	},
	{
		header: 'Interest Paid',
		accessorKey: 'interestPaid',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 120
	},
	{
		header: 'Pay Interval',
		accessorKey: 'paymentIntervalDays',
		cell: ({ getValue }) => `${getValue<number>()}d`,
		meta: { align: 'end' as const },
		size: 90
	},
	{
		header: 'Impaired',
		accessorKey: 'isImpaired',
		cell: ({ getValue }) => {
			const impaired = getValue<boolean>()
			return <span className={impaired ? 'text-red-500' : ''}>{impaired ? 'Yes' : 'No'}</span>
		},
		size: 80
	}
]

function LoansTable({ data }: { data: LoanRow[] }) {
	const [sorting, setSorting] = useState<SortingState>([{ id: 'principal', desc: true }])
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 15 })

	const instance = useReactTable({
		data,
		columns: loanColumns,
		state: { sorting, pagination },
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel()
	})

	if (data.length === 0) return null

	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">Open-Term Loans</h3>
			<VirtualTable instance={instance} skipVirtualization />
			{data.length > 15 && <Pagination table={instance} />}
		</div>
	)
}

const RATE_BUCKETS = [
	{ label: '0-2%', min: 0, max: 2 },
	{ label: '2-4%', min: 2, max: 4 },
	{ label: '4-6%', min: 4, max: 6 },
	{ label: '6-10%', min: 6, max: 10 },
	{ label: '10%+', min: 10, max: Infinity }
]

const AGE_BUCKETS = [
	{ label: '< 1mo', min: 0, max: 30 },
	{ label: '1-3mo', min: 30, max: 90 },
	{ label: '3-6mo', min: 90, max: 180 },
	{ label: '6-12mo', min: 180, max: 365 },
	{ label: '1y+', min: 365, max: Infinity }
]

export default function Loans() {
	const { pools, isLoading } = useMaplePoolsWithLoans()

	const nowSec = useMemo(() => Math.floor(Date.now() / 1000), [])

	const loanRows = useMemo<LoanRow[]>(() => {
		const rows: LoanRow[] = []
		for (const pool of pools) {
			for (const loan of pool.openTermLoans) {
				const fundingTs = parseInt(loan.fundingDate)
				const ageDays = fundingTs > 0 ? Math.floor((nowSec - fundingTs) / 86400) : 0
				rows.push({
					id: loan.id,
					borrower: loan.borrower.id,
					pool: pool.name,
					asset: pool.asset.symbol,
					principal: parseTokenAmount(loan.principalOwed, pool.asset.decimals),
					interestRate: parseInterestRate(loan.interestRate),
					isCalled: loan.isCalled,
					isImpaired: loan.isImpaired,
					interestPaid: parseTokenAmount(loan.interestPaid, pool.asset.decimals),
					fundingDate: fundingTs,
					ageDays,
					state: loan.state,
					paymentIntervalDays: parseInt(loan.paymentIntervalDays)
				})
			}
		}
		return rows.sort((a, b) => b.principal - a.principal)
	}, [pools, nowSec])

	const kpis = useMemo(() => {
		if (isLoading || loanRows.length === 0) return null

		const totalPrincipal = loanRows.reduce((s, l) => s + l.principal, 0)
		const totalInterestPaid = loanRows.reduce((s, l) => s + l.interestPaid, 0)
		const weightedRateSum = loanRows.reduce((s, l) => s + l.interestRate * l.principal, 0)
		const avgRate = totalPrincipal > 0 ? weightedRateSum / totalPrincipal : 0
		const avgAge = loanRows.length > 0 ? loanRows.reduce((s, l) => s + l.ageDays, 0) / loanRows.length : 0

		return {
			totalLoans: loanRows.length,
			totalPrincipal: formattedNum(totalPrincipal, true),
			avgRate: `${avgRate.toFixed(2)}%`,
			totalInterestPaid: formattedNum(totalInterestPaid, true),
			avgAge: `${Math.round(avgAge)}d`
		}
	}, [loanRows, isLoading])

	const principalByPool = useMemo(() => {
		const poolMap = new Map<string, number>()
		for (const loan of loanRows) {
			poolMap.set(loan.pool, (poolMap.get(loan.pool) ?? 0) + loan.principal)
		}
		return Array.from(poolMap.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([name, principal]) => ({ name, Principal: principal }))
	}, [loanRows])

	const rateDistribution = useMemo(() => {
		return RATE_BUCKETS.map((bucket) => {
			const matching = loanRows.filter((l) => l.interestRate >= bucket.min && l.interestRate < bucket.max)
			const principal = matching.reduce((s, l) => s + l.principal, 0)
			return { name: bucket.label, Principal: principal }
		}).filter((b) => b.Principal > 0)
	}, [loanRows])

	const ageDistribution = useMemo(() => {
		return AGE_BUCKETS.map((bucket) => {
			const matching = loanRows.filter((l) => l.ageDays >= bucket.min && l.ageDays < bucket.max)
			const principal = matching.reduce((s, l) => s + l.principal, 0)
			return { name: bucket.label, Principal: principal, Count: matching.length }
		}).filter((b) => b.Principal > 0)
	}, [loanRows])

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
				{kpis ? (
					<>
						<KpiCard label="Active Loans" value={kpis.totalLoans} />
						<KpiCard label="Total Principal" value={kpis.totalPrincipal} />
						<KpiCard label="Avg Interest Rate" value={kpis.avgRate} />
						<KpiCard label="Total Interest Paid" value={kpis.totalInterestPaid} />
						<KpiCard label="Avg Loan Age" value={kpis.avgAge} />
					</>
				) : (
					<>
						<KpiSkeleton label="Active Loans" />
						<KpiSkeleton label="Total Principal" />
						<KpiSkeleton label="Avg Interest Rate" />
						<KpiSkeleton label="Total Interest Paid" />
						<KpiSkeleton label="Avg Loan Age" />
					</>
				)}
			</div>

			{isLoading ? (
				<CardSkeleton title="Principal by Pool" />
			) : principalByPool.length > 0 ? (
				<ChartCard title="Principal by Pool">
					<BarChart
						chartData={principalByPool}
						stacks={{ Principal: 'a' }}
						stackColors={{ Principal: '#4FC3F7' }}
						valueSymbol="$"
						title=""
						height="400px"
						xAxisType="category"
					/>
				</ChartCard>
			) : null}

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{isLoading ? (
					<CardSkeleton title="Interest Rate Distribution" />
				) : rateDistribution.length > 0 ? (
					<ChartCard title="Interest Rate Distribution">
						<BarChart
							chartData={rateDistribution}
							stacks={{ Principal: 'a' }}
							stackColors={{ Principal: '#FFA726' }}
							valueSymbol="$"
							title=""
							height="400px"
							xAxisType="category"
						/>
					</ChartCard>
				) : null}

				{isLoading ? (
					<CardSkeleton title="Loan Age Distribution" />
				) : ageDistribution.length > 0 ? (
					<ChartCard title="Loan Age Distribution">
						<BarChart
							chartData={ageDistribution}
							stacks={{ Principal: 'a' }}
							stackColors={{ Principal: '#7E57C2' }}
							valueSymbol="$"
							title=""
							height="400px"
							xAxisType="category"
						/>
					</ChartCard>
				) : null}
			</div>

			{isLoading ? <CardSkeleton title="Open-Term Loans" /> : <LoansTable data={loanRows} />}
		</div>
	)
}
