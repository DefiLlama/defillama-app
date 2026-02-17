import { getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { lazy, useMemo, useState } from 'react'
import type { IBarChartProps } from '~/components/ECharts/types'
import { VirtualTable } from '~/components/Table/Table'
import { formattedNum } from '~/utils'
import { assignColors } from '../spark/api'
import { useMaplePoolsWithLoans, parseInterestRate, parseTokenAmount } from './api'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

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

interface LoanRow {
	id: string
	borrower: string
	pool: string
	asset: string
	principal: number
	interestRate: number
	isCalled: boolean
	isImpaired: boolean
}

const loanColumns: ColumnDef<LoanRow>[] = [
	{
		header: 'Borrower',
		accessorKey: 'borrower',
		cell: ({ getValue }) => {
			const addr = getValue<string>()
			return `${addr.slice(0, 6)}...${addr.slice(-4)}`
		},
		size: 140
	},
	{ header: 'Pool', accessorKey: 'pool', size: 220 },
	{ header: 'Asset', accessorKey: 'asset', size: 80 },
	{
		header: 'Principal',
		accessorKey: 'principal',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 140
	},
	{
		header: 'Interest Rate',
		accessorKey: 'interestRate',
		cell: ({ getValue }) => `${getValue<number>().toFixed(2)}%`,
		meta: { align: 'end' as const },
		size: 110
	},
	{
		header: 'Called',
		accessorKey: 'isCalled',
		cell: ({ getValue }) => (getValue<boolean>() ? 'Yes' : 'No'),
		size: 80
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

function Pagination({ table }: { table: ReturnType<typeof useReactTable<LoanRow>> }) {
	const { pageIndex, pageSize } = table.getState().pagination
	const total = table.getFilteredRowModel().rows.length

	return (
		<div className="mt-2 flex items-center justify-between text-xs text-(--text-label)">
			<span>
				{pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, total)} of {total}
			</span>
			<div className="flex gap-2">
				<button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="disabled:opacity-30">
					← Prev
				</button>
				<button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="disabled:opacity-30">
					Next →
				</button>
			</div>
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

export default function Loans() {
	const { pools, isLoading } = useMaplePoolsWithLoans()

	const loanRows = useMemo<LoanRow[]>(() => {
		const rows: LoanRow[] = []
		for (const pool of pools) {
			for (const loan of pool.openTermLoans) {
				rows.push({
					id: loan.id,
					borrower: loan.borrower.id,
					pool: pool.name,
					asset: pool.asset.symbol,
					principal: parseTokenAmount(loan.principalOwed, pool.asset.decimals),
					interestRate: parseInterestRate(loan.interestRate),
					isCalled: loan.isCalled,
					isImpaired: loan.isImpaired
				})
			}
		}
		return rows.sort((a, b) => b.principal - a.principal)
	}, [pools])

	const kpis = useMemo(() => {
		if (isLoading || loanRows.length === 0) return null

		const totalPrincipal = loanRows.reduce((s, l) => s + l.principal, 0)
		const impaired = loanRows.filter((l) => l.isImpaired).length
		const weightedRateSum = loanRows.reduce((s, l) => s + l.interestRate * l.principal, 0)
		const avgRate = totalPrincipal > 0 ? weightedRateSum / totalPrincipal : 0

		return {
			totalLoans: loanRows.length,
			totalPrincipal: formattedNum(totalPrincipal, true),
			avgRate: `${avgRate.toFixed(2)}%`,
			impaired
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

	const poolNames = useMemo(() => principalByPool.map((p) => p.name), [principalByPool])
	const poolColors = useMemo(() => assignColors(poolNames), [poolNames])

	const rateDistribution = useMemo(() => {
		return RATE_BUCKETS.map((bucket) => {
			const matching = loanRows.filter((l) => l.interestRate >= bucket.min && l.interestRate < bucket.max)
			const principal = matching.reduce((s, l) => s + l.principal, 0)
			return { name: bucket.label, Principal: principal, Count: matching.length }
		}).filter((b) => b.Principal > 0)
	}, [loanRows])

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				{kpis ? (
					<>
						<KpiCard label="Active Loans" value={kpis.totalLoans} />
						<KpiCard label="Total Principal" value={kpis.totalPrincipal} />
						<KpiCard label="Avg Interest Rate" value={kpis.avgRate} />
						<KpiCard label="Impaired Loans" value={kpis.impaired} />
					</>
				) : (
					<>
						<KpiSkeleton label="Active Loans" />
						<KpiSkeleton label="Total Principal" />
						<KpiSkeleton label="Avg Interest Rate" />
						<KpiSkeleton label="Impaired Loans" />
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
						stackColors={Object.fromEntries(poolNames.map((n) => [n, poolColors[n] ?? '#4FC3F7']))}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			) : null}

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
					/>
				</ChartCard>
			) : null}

			{isLoading ? <CardSkeleton title="Open-Term Loans" /> : <LoansTable data={loanRows} />}
		</div>
	)
}
