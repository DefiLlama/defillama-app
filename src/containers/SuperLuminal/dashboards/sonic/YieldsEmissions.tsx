import { lazy, useEffect, useMemo } from 'react'
import { createColumnHelper, useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel } from '@tanstack/react-table'
import type { IChartProps } from '~/components/ECharts/types'
import { useContentReady } from '~/containers/SuperLuminal/index'
import { useYieldsEmissionsData, type YieldPool } from './yieldsEmissionsApi'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const SCROLL_LEGEND = {
	legend: { type: 'scroll' as const, orient: 'horizontal' as const, top: 0 }
}

function KpiCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<span className="text-xs font-medium tracking-wide text-(--text-label)">{label}</span>
			<span className="text-2xl font-semibold text-(--text-primary)">{value}</span>
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
	return <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-label)">{children}</h2>
}

function formatPct(n: number | null): string {
	if (n === null || n === undefined) return '—'
	return `${n.toFixed(2)}%`
}

const columnHelper = createColumnHelper<YieldPool>()

const columns = [
	columnHelper.accessor('project', {
		header: 'Project',
		cell: (info) => <span className="font-medium">{info.getValue()}</span>,
		size: 160
	}),
	columnHelper.accessor('symbol', {
		header: 'Symbol',
		cell: (info) => <span>{info.getValue()}</span>,
		size: 140
	}),
	columnHelper.accessor('tvlUsd', {
		header: 'TVL',
		cell: (info) => <span className="tabular-nums">{info.row.original.tvlFormatted}</span>,
		size: 120
	}),
	columnHelper.accessor('apy', {
		header: 'APY',
		cell: (info) => (
			<span className="tabular-nums font-medium text-green-500">{info.row.original.apyFormatted}</span>
		),
		size: 100
	}),
	columnHelper.accessor('apyBase', {
		header: 'Base APY',
		cell: (info) => <span className="tabular-nums">{formatPct(info.getValue())}</span>,
		size: 100
	}),
	columnHelper.accessor('apyReward', {
		header: 'Reward APY',
		cell: (info) => <span className="tabular-nums">{formatPct(info.getValue())}</span>,
		size: 110
	})
]

export default function YieldsEmissions() {
	const { data, isLoading } = useYieldsEmissionsData()
	const onContentReady = useContentReady()

	useEffect(() => {
		if (data && !isLoading) {
			onContentReady()
		}
	}, [data, isLoading, onContentReady])

	const table = useReactTable({
		data: data?.yields.pools ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		initialState: {
			sorting: [{ id: 'tvlUsd', desc: true }],
			pagination: { pageSize: 15 }
		}
	})

	if (isLoading || !data) {
		return null
	}

	return (
		<div className="flex flex-col gap-6">
			{/* Emissions */}
			<div className="flex flex-col gap-4">
				<SectionHeader>S Token Emissions</SectionHeader>
				<ChartCard title={data.emissions.title}>
					<AreaChart
						chartData={data.emissions.data}
						stacks={data.emissions.stacks}
						stackColors={data.emissions.colors}
						valueSymbol=""
						title=""
						isStackedChart
						hideGradient
						height="400px"
						chartOptions={SCROLL_LEGEND}
					/>
				</ChartCard>
			</div>

			{/* Yield Pools */}
			<div className="flex flex-col gap-4">
				<SectionHeader>Yield Pools</SectionHeader>
				<div className="grid grid-cols-3 gap-4">
					<KpiCard label="Total Pools" value={data.yields.kpis.totalPools.formatted} />
					<KpiCard label="Total TVL" value={data.yields.kpis.totalTvl.formatted} />
					<KpiCard label="Avg APY" value={data.yields.kpis.avgApy.formatted} />
				</div>
				<div className="overflow-x-auto rounded-lg border border-(--cards-border) bg-(--cards-bg)">
					<table className="w-full">
						<thead>
							{table.getHeaderGroups().map((headerGroup) => (
								<tr key={headerGroup.id} className="border-b border-(--cards-border)">
									{headerGroup.headers.map((header) => (
										<th
											key={header.id}
											className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-(--text-label)"
											style={{ width: header.getSize() }}
											onClick={header.column.getToggleSortingHandler()}
										>
											<div className="flex cursor-pointer items-center gap-1">
												{typeof header.column.columnDef.header === 'string'
													? header.column.columnDef.header
													: null}
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
								<tr
									key={row.id}
									className="border-b border-(--cards-border) last:border-b-0 hover:bg-(--sl-hover-bg)"
								>
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
			</div>
		</div>
	)
}
