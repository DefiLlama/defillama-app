import { lazy, useEffect, useMemo, useState } from 'react'
import { createColumnHelper, useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel } from '@tanstack/react-table'
import type { IMultiSeriesChartProps } from '~/components/ECharts/types'
import { useContentReady } from '~/containers/SuperLuminal/index'
import { useFeeMData, type FeeMLeaderboardEntry } from './feemApi'
import { SonicIcon } from './SonicHeader'

const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart')) as React.FC<IMultiSeriesChartProps>

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

function formatNumber(n: number): string {
	if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
	if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
	if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
	return n.toFixed(0)
}

function formatS(n: number): string {
	return `${formatNumber(n)} S`
}

const columnHelper = createColumnHelper<FeeMLeaderboardEntry>()

const columns = [
	columnHelper.display({
		id: 'rank',
		header: '#',
		cell: (info) => <span className="text-(--text-label)">{info.row.index + 1}</span>,
		size: 40
	}),
	columnHelper.accessor('name', {
		header: 'Protocol',
		cell: (info) => {
			const row = info.row.original
			const displayName = row.name || 'Sonic'
			const isSonicFallback = !row.name
			const content = (
				<div className="flex items-center gap-2">
					{isSonicFallback ? (
						<SonicIcon className="h-5 w-5 shrink-0" />
					) : row.imageUrl ? (
						<img
							src={row.imageUrl}
							alt=""
							className="h-5 w-5 shrink-0 rounded-full"
							loading="lazy"
							onError={(e) => {
								;(e.target as HTMLImageElement).style.display = 'none'
							}}
						/>
					) : (
						<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--sl-accent-muted) text-[10px] font-bold text-(--sl-accent)">
							{displayName.charAt(0)}
						</span>
					)}
					<span className="truncate font-medium">{displayName}</span>
					{!row.isActive && (
						<span className="shrink-0 rounded bg-yellow-500/15 px-1.5 py-0.5 text-[10px] font-medium text-yellow-500">
							Inactive
						</span>
					)}
				</div>
			)
			if (row.websiteUrl) {
				return (
					<a href={row.websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
						{content}
					</a>
				)
			}
			return content
		},
		size: 200
	}),
	columnHelper.accessor('contractsCount', {
		header: 'Contracts',
		cell: (info) => <span className="tabular-nums">{formatNumber(info.getValue())}</span>,
		size: 100
	}),
	columnHelper.accessor('transactionsCount', {
		header: 'Transactions',
		cell: (info) => <span className="tabular-nums">{info.row.original.transactionsFormatted}</span>,
		size: 120
	}),
	columnHelper.accessor('collectedRewards', {
		header: 'Collected Rewards',
		cell: (info) => <span className="tabular-nums">{info.row.original.collectedRewardsFormatted}</span>,
		size: 140
	}),
	columnHelper.accessor('claimedRewards', {
		header: 'Claimed',
		cell: (info) => <span className="tabular-nums">{formatS(info.getValue())}</span>,
		size: 120
	}),
	columnHelper.accessor('rewardsToClaim', {
		header: 'Unclaimed',
		cell: (info) => <span className="tabular-nums">{formatS(info.getValue())}</span>,
		size: 120
	})
]

export default function FeeM() {
	const { data, isLoading } = useFeeMData()
	const onContentReady = useContentReady()

	useEffect(() => {
		if (data && !isLoading) {
			onContentReady()
		}
	}, [data, isLoading, onContentReady])

	const table = useReactTable({
		data: data?.leaderboard ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		initialState: {
			sorting: [{ id: 'collectedRewards', desc: true }],
			pagination: { pageSize: 15 }
		}
	})

	if (isLoading || !data) {
		return null
	}

	return (
		<div className="flex flex-col gap-6">
			{/* Global KPIs */}
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<KpiCard label="Total Contracts" value={data.globalKpis.totalContracts.formatted} />
				<KpiCard label="Total Transactions" value={data.globalKpis.totalTransactions.formatted} />
				<KpiCard label="Total Collected" value={data.globalKpis.totalCollected.formatted} />
				<KpiCard label="Total Claimed" value={data.globalKpis.totalClaimed.formatted} />
			</div>

			{/* Daily Stats Chart */}
			<div className="flex flex-col gap-4">
				<SectionHeader>Daily Activity</SectionHeader>
				<ChartCard title={data.dailyStatsTitle}>
					<MultiSeriesChart
						series={data.dailyStatsSeries}
						valueSymbol=""
						yAxisSymbols={['', 'S']}
						height="400px"
					/>
				</ChartCard>
			</div>

			{/* FeeM Leaderboard */}
			<div className="flex flex-col gap-4">
				<SectionHeader>FeeM Leaderboard</SectionHeader>
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
								<tr key={row.id} className="border-b border-(--cards-border) last:border-b-0 hover:bg-(--sl-hover-bg)">
									{row.getVisibleCells().map((cell) => (
										<td key={cell.id} className="px-4 py-2.5 text-sm text-(--text-primary)">
											{typeof cell.column.columnDef.cell === 'function'
												? cell.column.columnDef.cell(cell.getContext())
												: cell.getValue() as string}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>

					{/* Pagination */}
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
