import { getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { lazy, useMemo, useState } from 'react'
import type { IBarChartProps } from '~/components/ECharts/types'
import { VirtualTable } from '~/components/Table/Table'
import { formattedNum } from '~/utils'
import { useStSyrupTxes, useSyrupTxes, useSyrupGlobals, useStSyrupState, useSyrupDripTxes, parseWad, parseTokenAmount } from './api'
import { ChartCard, CardSkeleton, KpiCard, KpiSkeleton, Pagination } from './shared'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

interface TxRow {
	id: string
	timestamp: number
	type: 'deposit' | 'withdraw'
	assetsAmount: number
	account: string
}

interface DripRow {
	id: string
	timestamp: number
	type: string
	amount: number
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

const dripColumns: ColumnDef<DripRow>[] = [
	{
		header: 'Date',
		accessorKey: 'timestamp',
		cell: ({ getValue }) => new Date(getValue<number>() * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
		size: 140
	},
	{
		header: 'Type',
		accessorKey: 'type',
		cell: ({ getValue }) => <span className="capitalize">{getValue<string>()}</span>,
		size: 100
	},
	{
		header: 'Amount',
		accessorKey: 'amount',
		cell: ({ getValue }) => formattedNum(getValue<number>(), false),
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

function DripTable({ data }: { data: DripRow[] }) {
	const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }])
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 15 })

	const instance = useReactTable({
		data,
		columns: dripColumns,
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
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">Recent Drip Reward Claims</h3>
			<VirtualTable instance={instance} skipVirtualization />
			{data.length > 15 && <Pagination table={instance} />}
		</div>
	)
}

function monthKey(ts: number): number {
	const d = new Date(ts * 1000)
	return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000
}

function aggregateByMonth(txes: TxRow[]) {
	const map = new Map<number, { deposits: number; withdrawals: number }>()

	for (const tx of txes) {
		const mk = monthKey(tx.timestamp)
		const entry = map.get(mk) ?? { deposits: 0, withdrawals: 0 }
		if (tx.type === 'deposit') {
			entry.deposits += tx.assetsAmount
		} else {
			entry.withdrawals += tx.assetsAmount
		}
		map.set(mk, entry)
	}

	return Array.from(map.entries())
		.sort(([a], [b]) => a - b)
		.map(([date, v]) => ({
			date,
			Deposits: v.deposits,
			Withdrawals: v.withdrawals
		}))
}

function aggregateDripByMonth(txes: DripRow[]) {
	const map = new Map<number, number>()

	for (const tx of txes) {
		const mk = monthKey(tx.timestamp)
		map.set(mk, (map.get(mk) ?? 0) + tx.amount)
	}

	return Array.from(map.entries())
		.sort(([a], [b]) => a - b)
		.map(([date, amount]) => ({ date, Claimed: amount }))
}

export default function SyrupActivity() {
	const { txes: stSyrupTxes, isLoading: stLoading } = useStSyrupTxes()
	const { txes: syrupTxes, isLoading: syrupLoading } = useSyrupTxes()
	const { globals, isLoading: globalsLoading } = useSyrupGlobals()
	const { state: stSyrupState, isLoading: stStateLoading } = useStSyrupState()
	const { txes: dripTxes, isLoading: dripLoading } = useSyrupDripTxes()

	const protocolKpis = useMemo(() => {
		if (globalsLoading || stStateLoading) return null
		if (!globals && !stSyrupState) return null

		const syrupTvl = globals ? parseTokenAmount(globals.tvl, 6) : null
		const syrupApy = globals ? parseWad(globals.apy, 28) : null

		let exchangeRate: number | null = null
		let stSupply: number | null = null
		if (stSyrupState) {
			const totalSupply = parseWad(stSyrupState.totalSupply, stSyrupState.precision)
			const freeAssets = parseWad(stSyrupState.freeAssets, stSyrupState.precision)
			exchangeRate = totalSupply > 0 ? freeAssets / totalSupply : null
			stSupply = totalSupply
		}

		return {
			tvl: syrupTvl != null ? formattedNum(syrupTvl, true) : null,
			apy: syrupApy != null ? `${syrupApy.toFixed(2)}%` : null,
			exchangeRate: exchangeRate != null ? exchangeRate.toFixed(4) : null,
			stSupply: stSupply != null ? formattedNum(stSupply, false) : null
		}
	}, [globals, stSyrupState, globalsLoading, stStateLoading])

	const txRows = useMemo<TxRow[]>(() => {
		return stSyrupTxes.map((tx) => ({
			id: tx.id,
			timestamp: parseInt(tx.timestamp),
			type: tx.type,
			assetsAmount: parseWad(tx.assetsAmount, 18),
			account: tx.account.id
		}))
	}, [stSyrupTxes])

	const dripRows = useMemo<DripRow[]>(() => {
		return dripTxes.map((tx) => ({
			id: tx.id,
			timestamp: parseInt(tx.timestamp),
			type: tx.type,
			amount: parseWad(tx.amount, 18),
			account: tx.account.id
		}))
	}, [dripTxes])

	const activityKpis = useMemo(() => {
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

	const dripKpis = useMemo(() => {
		if (dripLoading || dripRows.length === 0) return null

		const totalClaimed = dripRows.reduce((s, t) => s + t.amount, 0)
		const uniqueClaimers = new Set(dripRows.map((t) => t.account)).size

		return {
			totalClaims: dripRows.length,
			totalClaimed: formattedNum(totalClaimed, false),
			uniqueClaimers
		}
	}, [dripRows, dripLoading])

	const monthlyChart = useMemo(() => aggregateByMonth(txRows), [txRows])
	const dripMonthlyChart = useMemo(() => aggregateDripByMonth(dripRows), [dripRows])

	const migrationChart = useMemo(() => {
		const map = new Map<number, number>()
		for (const tx of syrupTxes) {
			const ts = parseInt(tx.timestamp)
			const mk = monthKey(ts)
			const amount = parseWad(tx.tokensMigrated, 18)
			map.set(mk, (map.get(mk) ?? 0) + amount)
		}
		return Array.from(map.entries())
			.sort(([a], [b]) => a - b)
			.map(([date, amount]) => ({ date, 'Tokens Migrated': amount }))
	}, [syrupTxes])

	const isLoading = stLoading || syrupLoading

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h3 className="mb-3 text-sm font-semibold tracking-wide text-(--text-label) uppercase">Syrup Protocol</h3>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
					{protocolKpis ? (
						<>
							<KpiCard label="Syrup TVL" value={protocolKpis.tvl} />
							<KpiCard label="Syrup APY" value={protocolKpis.apy} />
							<KpiCard label="stSyrup Rate" value={protocolKpis.exchangeRate} />
							<KpiCard label="stSyrup Supply" value={protocolKpis.stSupply} />
						</>
					) : (
						<>
							<KpiSkeleton label="Syrup TVL" />
							<KpiSkeleton label="Syrup APY" />
							<KpiSkeleton label="stSyrup Rate" />
							<KpiSkeleton label="stSyrup Supply" />
						</>
					)}
				</div>
			</div>

			<div>
				<h3 className="mb-3 text-sm font-semibold tracking-wide text-(--text-label) uppercase">stSyrup Activity</h3>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
					{activityKpis ? (
						<>
							<KpiCard label="Total Migrations" value={activityKpis.totalMigrations} />
							<KpiCard label="Tokens Migrated" value={activityKpis.tokensMigrated} />
							<KpiCard label="stSyrup Deposits" value={activityKpis.deposits} />
							<KpiCard label="stSyrup Withdrawals" value={activityKpis.withdrawals} />
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
			</div>

		{isLoading ? (
			<CardSkeleton title="Monthly stSyrup Deposits vs Withdrawals" />
		) : monthlyChart.length > 0 ? (
			<ChartCard title="Monthly stSyrup Deposits vs Withdrawals">
					<BarChart
						chartData={monthlyChart}
						stacks={{ Deposits: 'a', Withdrawals: 'b' }}
						stackColors={{ Deposits: '#4CAF50', Withdrawals: '#E91E63' }}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			) : null}

		{isLoading ? (
			<CardSkeleton title="Monthly Syrup Token Migrations" />
		) : migrationChart.length > 0 ? (
			<ChartCard title="Monthly Syrup Token Migrations">
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

			<div>
				<h3 className="mb-3 text-sm font-semibold tracking-wide text-(--text-label) uppercase">Drip Rewards</h3>
				<div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
					{dripKpis ? (
						<>
							<KpiCard label="Total Claims" value={dripKpis.totalClaims} />
							<KpiCard label="Total Claimed" value={dripKpis.totalClaimed} />
							<KpiCard label="Unique Claimers" value={dripKpis.uniqueClaimers} />
						</>
					) : (
						<>
							<KpiSkeleton label="Total Claims" />
							<KpiSkeleton label="Total Claimed" />
							<KpiSkeleton label="Unique Claimers" />
						</>
					)}
				</div>

			{dripLoading ? (
				<CardSkeleton title="Monthly Drip Claims" />
			) : dripMonthlyChart.length > 0 ? (
				<ChartCard title="Monthly Drip Claims">
					<BarChart
						chartData={dripMonthlyChart}
							stacks={{ Claimed: 'a' }}
							stackColors={{ Claimed: '#FF7043' }}
							title=""
							height="400px"
						/>
					</ChartCard>
				) : null}
			</div>

			{dripLoading ? <CardSkeleton title="Recent Drip Reward Claims" /> : <DripTable data={dripRows} />}
		</div>
	)
}
