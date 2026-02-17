import { getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { lazy, useMemo, useState } from 'react'
import type { IBarChartProps } from '~/components/ECharts/types'
import { VirtualTable } from '~/components/Table/Table'
import { formattedNum } from '~/utils'
import { useStSyrupTxes, useSyrupTxes, parseWad } from './api'

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

interface TxRow {
	id: string
	timestamp: number
	type: 'deposit' | 'withdraw'
	assetsAmount: number
	account: string
}

const txColumns: ColumnDef<TxRow>[] = [
	{
		header: 'Date',
		accessorKey: 'timestamp',
		cell: ({ getValue }) => new Date(getValue<number>() * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
		size: 140
	},
	{
		header: 'Type',
		accessorKey: 'type',
		cell: ({ getValue }) => {
			const t = getValue<string>()
			return <span className={t === 'deposit' ? 'text-green-500' : 'text-red-500'}>{t === 'deposit' ? 'Deposit' : 'Withdraw'}</span>
		},
		size: 100
	},
	{
		header: 'Amount',
		accessorKey: 'assetsAmount',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 140
	},
	{
		header: 'Account',
		accessorKey: 'account',
		cell: ({ getValue }) => {
			const addr = getValue<string>()
			return `${addr.slice(0, 6)}...${addr.slice(-4)}`
		},
		size: 140
	}
]

function TxTable({ data }: { data: TxRow[] }) {
	const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }])
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 15 })

	const instance = useReactTable({
		data,
		columns: txColumns,
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
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">Recent stSyrup Transactions</h3>
			<VirtualTable instance={instance} skipVirtualization />
			{data.length > 15 && <Pagination table={instance} />}
		</div>
	)
}

function Pagination({ table }: { table: ReturnType<typeof useReactTable<TxRow>> }) {
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

function aggregateByDay(txes: TxRow[]) {
	const map = new Map<number, { deposits: number; withdrawals: number }>()

	for (const tx of txes) {
		const dayTs = Math.floor(tx.timestamp / 86400) * 86400
		const entry = map.get(dayTs) ?? { deposits: 0, withdrawals: 0 }
		if (tx.type === 'deposit') {
			entry.deposits += tx.assetsAmount
		} else {
			entry.withdrawals += tx.assetsAmount
		}
		map.set(dayTs, entry)
	}

	return Array.from(map.entries())
		.sort(([a], [b]) => a - b)
		.map(([date, v]) => ({
			date,
			Deposits: v.deposits,
			Withdrawals: v.withdrawals
		}))
}

export default function SyrupActivity() {
	const { txes: stSyrupTxes, isLoading: stLoading } = useStSyrupTxes()
	const { txes: syrupTxes, isLoading: syrupLoading } = useSyrupTxes()

	const txRows = useMemo<TxRow[]>(() => {
		return stSyrupTxes.map((tx) => ({
			id: tx.id,
			timestamp: parseInt(tx.timestamp),
			type: tx.type,
			assetsAmount: parseWad(tx.assetsAmount, 18),
			account: tx.account.id
		}))
	}, [stSyrupTxes])

	const kpis = useMemo(() => {
		if (stLoading || syrupLoading) return null

		const deposits = txRows.filter((t) => t.type === 'deposit')
		const withdrawals = txRows.filter((t) => t.type === 'withdraw')
		const totalMigrated = syrupTxes.reduce((s, tx) => s + parseWad(tx.tokensMigrated, 18), 0)

		return {
			totalMigrations: syrupTxes.length,
			tokensMigrated: formattedNum(totalMigrated),
			deposits: deposits.length,
			withdrawals: withdrawals.length
		}
	}, [txRows, syrupTxes, stLoading, syrupLoading])

	const dailyChart = useMemo(() => aggregateByDay(txRows), [txRows])

	const migrationChart = useMemo(() => {
		const map = new Map<number, number>()
		for (const tx of syrupTxes) {
			const ts = parseInt(tx.timestamp)
			const dayTs = Math.floor(ts / 86400) * 86400
			const amount = parseWad(tx.tokensMigrated, 18)
			map.set(dayTs, (map.get(dayTs) ?? 0) + amount)
		}
		return Array.from(map.entries())
			.sort(([a], [b]) => a - b)
			.map(([date, amount]) => ({ date, 'Tokens Migrated': amount }))
	}, [syrupTxes])

	const isLoading = stLoading || syrupLoading

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				{kpis ? (
					<>
						<KpiCard label="Total Migrations" value={kpis.totalMigrations} />
						<KpiCard label="Tokens Migrated" value={kpis.tokensMigrated} />
						<KpiCard label="stSyrup Deposits" value={kpis.deposits} />
						<KpiCard label="stSyrup Withdrawals" value={kpis.withdrawals} />
					</>
				) : (
					<>
						<KpiSkeleton label="Total Migrations" />
						<KpiSkeleton label="Tokens Migrated" />
						<KpiSkeleton label="stSyrup Deposits" />
						<KpiSkeleton label="stSyrup Withdrawals" />
					</>
				)}
			</div>

			{isLoading ? (
				<CardSkeleton title="stSyrup Deposits vs Withdrawals" />
			) : dailyChart.length > 0 ? (
				<ChartCard title="stSyrup Deposits vs Withdrawals">
					<BarChart
						chartData={dailyChart}
						stacks={{ Deposits: 'a', Withdrawals: 'b' }}
						stackColors={{ Deposits: '#4CAF50', Withdrawals: '#E91E63' }}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			) : null}

			{isLoading ? (
				<CardSkeleton title="Syrup Token Migrations" />
			) : migrationChart.length > 0 ? (
				<ChartCard title="Syrup Token Migrations">
					<BarChart
						chartData={migrationChart}
						stacks={{ 'Tokens Migrated': 'a' }}
						stackColors={{ 'Tokens Migrated': '#9C27B0' }}
						title=""
						height="400px"
					/>
				</ChartCard>
			) : null}

			{isLoading ? <CardSkeleton title="Recent stSyrup Transactions" /> : <TxTable data={txRows} />}
		</div>
	)
}
