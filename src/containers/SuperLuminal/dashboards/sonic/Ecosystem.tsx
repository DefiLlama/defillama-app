import {
	createColumnHelper,
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getPaginationRowModel
} from '@tanstack/react-table'
import { lazy, useEffect, useMemo, useState } from 'react'
import type { IBarChartProps, IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { useContentReady } from '~/containers/SuperLuminal/index'
import { useEcosystemData, type TopProtocolEntry, type AssetCategory } from './ecosystemApi'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>
const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

function KpiCard({
	label,
	value,
	change
}: {
	label: string
	value: string
	change?: { value: number; formatted: string }
}) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<span className="text-xs font-medium tracking-wide text-(--text-label)">{label}</span>
			<div className="flex items-baseline gap-2">
				<span className="text-2xl font-semibold text-(--text-primary)">{value}</span>
				{change && (
					<span className={`text-xs font-medium ${change.value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
						{change.formatted}
					</span>
				)}
			</div>
		</div>
	)
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">{title}</h3>
			{children}
		</div>
	)
}

function SectionHeader({ children }: { children: React.ReactNode }) {
	return <h2 className="text-xs font-semibold tracking-wider text-(--text-label) uppercase">{children}</h2>
}

function formatUsd(n: number): string {
	if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
	if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
	if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
	return `$${n.toFixed(2)}`
}

const protocolColumnHelper = createColumnHelper<TopProtocolEntry>()

function makeProtocolColumns(valueLabel: string) {
	return [
		protocolColumnHelper.display({
			id: 'rank',
			header: '#',
			cell: (info) => <span className="text-(--text-label)">{info.row.index + 1}</span>,
			size: 40
		}),
		protocolColumnHelper.accessor('name', {
			header: 'Name',
			cell: (info) => {
				const row = info.row.original
				return (
					<div className="flex items-center gap-2">
						{row.logo ? (
							<img
								src={row.logo}
								alt=""
								className="h-5 w-5 shrink-0 rounded-full"
								loading="lazy"
								onError={(e) => {
									;(e.target as HTMLImageElement).style.display = 'none'
								}}
							/>
						) : (
							<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--sl-accent-muted) text-[10px] font-bold text-(--sl-accent)">
								{row.name.charAt(0)}
							</span>
						)}
						<span className="truncate font-medium">{row.name}</span>
					</div>
				)
			},
			size: 200
		}),
		protocolColumnHelper.accessor('category', {
			header: 'Category',
			cell: (info) => <span className="text-(--text-label)">{info.getValue() ?? '—'}</span>,
			size: 120
		}),
		protocolColumnHelper.accessor('total24h', {
			header: `24h ${valueLabel}`,
			cell: (info) => <span className="tabular-nums">{info.row.original.total24hFormatted}</span>,
			size: 120
		}),
		protocolColumnHelper.accessor('total7d', {
			header: `7d ${valueLabel}`,
			cell: (info) => <span className="tabular-nums">{formatUsd(info.getValue())}</span>,
			size: 120
		}),
		protocolColumnHelper.accessor('total30d', {
			header: `30d ${valueLabel}`,
			cell: (info) => <span className="tabular-nums">{formatUsd(info.getValue())}</span>,
			size: 120
		}),
		protocolColumnHelper.accessor('totalAllTime', {
			header: `All-Time ${valueLabel}`,
			cell: (info) => <span className="tabular-nums">{formatUsd(info.getValue())}</span>,
			size: 130
		})
	]
}

function ProtocolTable({ data, valueLabel }: { data: TopProtocolEntry[]; valueLabel: string }) {
	const columns = useMemo(() => makeProtocolColumns(valueLabel), [valueLabel])

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		initialState: {
			sorting: [{ id: 'total24h', desc: true }],
			pagination: { pageSize: 10 }
		}
	})

	return (
		<div className="overflow-x-auto rounded-lg border border-(--cards-border) bg-(--cards-bg)">
			<table className="w-full">
				<thead>
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id} className="border-b border-(--cards-border)">
							{headerGroup.headers.map((header) => (
								<th
									key={header.id}
									className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-(--text-label) uppercase"
									style={{ width: header.getSize() }}
									onClick={header.column.getToggleSortingHandler()}
								>
									<div className="flex cursor-pointer items-center gap-1">
										{typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : null}
										{header.column.getIsSorted() === 'asc'
											? ' \u2191'
											: header.column.getIsSorted() === 'desc'
												? ' \u2193'
												: ''}
									</div>
								</th>
							))}
						</tr>
					))}
				</thead>
				<tbody>
					{table.getRowModel().rows.map((row) => (
						<tr key={row.id} className="border-b border-(--cards-border) last:border-b-0 hover:bg-(--sl-hover-bg)">
							{row.getVisibleCells().map((cell) => (
								<td key={cell.id} className="px-4 py-2.5 text-sm text-(--text-primary)">
									{typeof cell.column.columnDef.cell === 'function'
										? cell.column.columnDef.cell(cell.getContext())
										: (cell.getValue() as string)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
			{table.getPageCount() > 1 && (
				<div className="flex items-center justify-between border-t border-(--cards-border) px-4 py-3">
					<span className="text-xs text-(--text-label)">
						Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
					</span>
					<div className="flex gap-1">
						<button
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
							className="rounded-md border border-(--cards-border) px-3 py-1 text-xs text-(--text-secondary) transition-colors hover:bg-(--sl-hover-bg) disabled:opacity-40"
						>
							Prev
						</button>
						<button
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
							className="rounded-md border border-(--cards-border) px-3 py-1 text-xs text-(--text-secondary) transition-colors hover:bg-(--sl-hover-bg) disabled:opacity-40"
						>
							Next
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

function AssetBreakdownSection({
	categories,
	pieData,
	pieColors,
	totalFormatted,
	title
}: {
	categories: AssetCategory[]
	pieData: Array<{ name: string; value: number }>
	pieColors: Record<string, string>
	totalFormatted: string
	title: string
}) {
	const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

	const toggleRow = (idx: number) => {
		setExpandedRows((prev) => {
			const next = new Set(prev)
			if (next.has(idx)) next.delete(idx)
			else next.add(idx)
			return next
		})
	}

	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-4 text-sm font-medium text-(--text-label)">{title}</h3>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div className="min-h-[320px]">
					<PieChart
						chartData={pieData}
						stackColors={pieColors}
						radius={['40%', '70%']}
						height="320px"
						valueSymbol="$"
					/>
				</div>
				<div>
					<div className="max-h-[400px] overflow-y-auto">
						{categories.map((cat, idx) => {
							const breakdownEntries = Object.entries(cat.breakdown).sort(([, a], [, b]) => b - a)
							const hasChildren = breakdownEntries.length > 0
							const isOpen = expandedRows.has(idx)
							const color = pieColors[cat.name] || '#8b949e'
							return (
								<div key={cat.name} className="border-b border-(--cards-border) last:border-b-0">
									<div
										className={`flex cursor-pointer items-center gap-2 py-2.5 ${hasChildren ? 'hover:opacity-80' : ''}`}
										onClick={() => hasChildren && toggleRow(idx)}
									>
										<span className="w-4 shrink-0 text-[10px] text-(--text-label)">
											{hasChildren ? (isOpen ? '\u25BC' : '\u25B6') : ''}
										</span>
										<span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
										<span className="min-w-0 flex-1 truncate text-sm text-(--text-primary) capitalize">{cat.name}</span>
										<span className="shrink-0 text-sm font-semibold text-(--text-primary)">{cat.formatted}</span>
										<span className="w-12 shrink-0 text-right text-xs text-(--text-label)">{cat.pct}%</span>
									</div>
									{isOpen && (
										<div className="pb-2 pl-8">
											{breakdownEntries.map(([symbol, value]) => (
												<div key={symbol} className="flex items-center py-1.5 text-xs text-(--text-label)">
													<span className="min-w-0 flex-1 truncate">{symbol}</span>
													<span className="shrink-0">{formatUsd(value)}</span>
												</div>
											))}
										</div>
									)}
								</div>
							)
						})}
					</div>
					<div className="mt-3 flex items-center justify-between border-t border-(--cards-border) pt-3">
						<span className="text-sm text-(--text-label)">Total</span>
						<span className="text-sm font-bold text-(--text-primary)">{totalFormatted}</span>
					</div>
				</div>
			</div>
		</div>
	)
}

export default function Ecosystem() {
	const { data, isLoading } = useEcosystemData()
	const onContentReady = useContentReady()

	useEffect(() => {
		if (data && !isLoading) {
			onContentReady()
		}
	}, [data, isLoading, onContentReady])

	if (isLoading || !data) {
		return null
	}

	return (
		<div className="flex flex-col gap-6">
			{/* TVL */}
			<div className="flex flex-col gap-4">
				<SectionHeader>Total Value Locked</SectionHeader>
				<KpiCard label="Current TVL" value={data.tvl.currentFormatted} />
				<ChartCard title={data.tvl.title}>
					<AreaChart chartData={data.tvl.data} stacks={data.tvl.stacks} valueSymbol="$" title="" height="400px" />
				</ChartCard>
			</div>

			{/* Fees */}
			<div className="flex flex-col gap-4">
				<SectionHeader>Protocol Fees</SectionHeader>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
					<KpiCard label="24h Fees" value={data.fees.kpis.total24h.formatted} change={data.fees.kpis.change1d} />
					<KpiCard label="7d Fees" value={data.fees.kpis.total7d.formatted} change={data.fees.kpis.change7d} />
					<KpiCard label="30d Fees" value={data.fees.kpis.total30d.formatted} change={data.fees.kpis.change1m} />
					<KpiCard label="All-Time Fees" value={data.fees.kpis.totalAllTime.formatted} />
				</div>
				<ChartCard title={data.fees.title}>
					<BarChart chartData={data.fees.data} stacks={data.fees.stacks} valueSymbol="$" title="" height="400px" />
				</ChartCard>
				<SectionHeader>Top Protocols by Fees</SectionHeader>
				<ProtocolTable data={data.fees.topProtocols} valueLabel="Fees" />
			</div>

			{/* DEX Volume */}
			<div className="flex flex-col gap-4">
				<SectionHeader>DEX Volume</SectionHeader>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
					<KpiCard
						label="24h Volume"
						value={data.dexVolume.kpis.total24h.formatted}
						change={data.dexVolume.kpis.change1d}
					/>
					<KpiCard
						label="7d Volume"
						value={data.dexVolume.kpis.total7d.formatted}
						change={data.dexVolume.kpis.change7d}
					/>
					<KpiCard
						label="30d Volume"
						value={data.dexVolume.kpis.total30d.formatted}
						change={data.dexVolume.kpis.change1m}
					/>
					<KpiCard label="All-Time Volume" value={data.dexVolume.kpis.totalAllTime.formatted} />
				</div>
				<ChartCard title={data.dexVolume.title}>
					<BarChart
						chartData={data.dexVolume.data}
						stacks={data.dexVolume.stacks}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
				<SectionHeader>Top DEXes by Volume</SectionHeader>
				<ProtocolTable data={data.dexVolume.topDexes} valueLabel="Volume" />
			</div>

			{/* Stablecoins */}
			<div className="flex flex-col gap-4">
				<SectionHeader>Stablecoins</SectionHeader>
				<div className="grid grid-cols-3 gap-4">
					<KpiCard label="Circulating" value={data.stablecoins.kpis.currentCirculating.formatted} />
					<KpiCard label="Minted (Native)" value={data.stablecoins.kpis.currentMinted.formatted} />
					<KpiCard label="Bridged" value={data.stablecoins.kpis.currentBridged.formatted} />
				</div>
				<ChartCard title={data.stablecoins.title}>
					<AreaChart
						chartData={data.stablecoins.data}
						stacks={data.stablecoins.stacks}
						stackColors={data.stablecoins.colors}
						valueSymbol="$"
						title=""
						isStackedChart
						hideGradient
						height="400px"
					/>
				</ChartCard>
			</div>

			{/* Chain Assets */}
			<div className="flex flex-col gap-4">
				<SectionHeader>Chain Assets</SectionHeader>
				<AssetBreakdownSection
					categories={data.chainAssets.categories}
					pieData={data.chainAssets.pieData}
					pieColors={data.chainAssets.pieColors}
					totalFormatted={data.chainAssets.totalFormatted}
					title={data.chainAssets.title}
				/>
			</div>
		</div>
	)
}
