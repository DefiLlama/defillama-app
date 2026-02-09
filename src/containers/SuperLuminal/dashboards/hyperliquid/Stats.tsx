import {
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	PaginationState,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { BarChart, PieChart as EPieChart, ScatterChart as EScatterChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([CanvasRenderer, BarChart, EPieChart, EScatterChart, GridComponent, TooltipComponent])
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { VirtualTable } from '~/components/Table/Table'
import { formattedNum } from '~/utils'
import {
	PerpMarket,
	PredictedFunding,
	SpotMarket,
	useHyperliquidPerps,
	useHyperliquidPredictedFundings,
	useHyperliquidSpot,
	useHyperliquidWs,
	WsSubscription
} from './api'

const ALL_MIDS_SUB: WsSubscription[] = [{ type: 'allMids' }]
const TICKER_SPEED_PX_PER_SEC = 52
const PAGE_SIZE = 10

type TickerCoinNodes = {
	items: HTMLElement[]
	prices: HTMLElement[]
}

function formatPct(value: number | null | undefined) {
	if (value == null) return '—'
	return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function formatTimestamp(ts: number | null | undefined) {
	if (!ts) return '—'
	return new Date(ts).toLocaleString('en-US', {
		hour12: false,
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	})
}

function PriceTickerTape({ coins }: { coins: string[] }) {
	const viewportRef = useRef<HTMLDivElement>(null)
	const laneARef = useRef<HTMLDivElement>(null)
	const laneBRef = useRef<HTMLDivElement>(null)
	const coinNodesRef = useRef<Record<string, TickerCoinNodes>>({})
	const prevPrices = useRef<Record<string, string>>({})
	const latestMidsRef = useRef<Record<string, string> | null>(null)
	const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
	const rafRef = useRef<number>(0)
	const laneWidthRef = useRef(0)
	const positionsRef = useRef({ a: 0, b: 0 })
	const lastFrameTsRef = useRef<number | null>(null)

	useEffect(() => {
		const root = viewportRef.current
		if (!root) return

		const next: Record<string, TickerCoinNodes> = {}
		for (const coin of coins) {
			const items = Array.from(root.querySelectorAll<HTMLElement>(`[data-coin="${coin}"]`))
			next[coin] = {
				items,
				prices: items
					.map((item) => item.querySelector<HTMLElement>('[data-price]'))
					.filter((el): el is HTMLElement => el != null)
			}
		}

		coinNodesRef.current = next
	}, [coins])

	useHyperliquidWs(ALL_MIDS_SUB, (msg) => {
		if (msg.channel !== 'allMids') return
		const mids = msg.data?.mids as Record<string, string> | undefined
		if (!mids) return
		latestMidsRef.current = mids
	})

	useEffect(() => {
		const timers = flashTimers.current
		return () => {
			for (const t of Object.values(timers)) clearTimeout(t)
		}
	}, [])

	useEffect(() => {
		const laneA = laneARef.current
		const laneB = laneBRef.current
		if (!laneA || !laneB) return

		const applyTransforms = () => {
			laneA.style.transform = `translate3d(${positionsRef.current.a}px,0,0)`
			laneB.style.transform = `translate3d(${positionsRef.current.b}px,0,0)`
		}

		const measure = () => {
			const nextWidth = laneA.getBoundingClientRect().width
			if (nextWidth <= 0) return
			laneWidthRef.current = nextWidth
			positionsRef.current = { a: 0, b: nextWidth }
			applyTransforms()
		}

		measure()

		const ro = new ResizeObserver(measure)
		ro.observe(laneA)

		const tick = (ts: number) => {
			const mids = latestMidsRef.current
			if (mids) {
				latestMidsRef.current = null
				const prev = prevPrices.current
				for (const coin of coins) {
					if (!mids[coin]) continue
					const nodes = coinNodesRef.current[coin]
					if (!nodes) continue

					const price = parseFloat(mids[coin])
					const formatted = formattedNum(price, true) as string

					nodes.prices.forEach((el) => {
						el.textContent = formatted
					})

					if (prev[coin] && mids[coin] !== prev[coin]) {
						const dir = price > parseFloat(prev[coin]) ? 'up' : 'down'
						const flashColor = dir === 'up' ? '#4ade80' : '#f87171'

						nodes.items.forEach((el) => {
							el.style.color = flashColor
						})

						clearTimeout(flashTimers.current[coin])
						flashTimers.current[coin] = setTimeout(() => {
							nodes.items.forEach((el) => {
								el.style.color = ''
							})
						}, 700)
					}
				}
				prevPrices.current = mids
			}

			if (lastFrameTsRef.current == null) lastFrameTsRef.current = ts
			const dt = (ts - lastFrameTsRef.current) / 1000
			lastFrameTsRef.current = ts

			const laneWidth = laneWidthRef.current
			if (laneWidth > 0) {
				positionsRef.current.a -= dt * TICKER_SPEED_PX_PER_SEC
				positionsRef.current.b -= dt * TICKER_SPEED_PX_PER_SEC

				if (positionsRef.current.a <= -laneWidth) {
					positionsRef.current.a = positionsRef.current.b + laneWidth
				}
				if (positionsRef.current.b <= -laneWidth) {
					positionsRef.current.b = positionsRef.current.a + laneWidth
				}

				applyTransforms()
			}

			rafRef.current = window.requestAnimationFrame(tick)
		}

		rafRef.current = window.requestAnimationFrame(tick)

		return () => {
			ro.disconnect()
			window.cancelAnimationFrame(rafRef.current)
			lastFrameTsRef.current = null
		}
	}, [coins])

	useEffect(() => {
		positionsRef.current = { a: 0, b: 0 }
		laneWidthRef.current = 0
		lastFrameTsRef.current = null
		if (laneARef.current) laneARef.current.style.transform = 'translate3d(0,0,0)'
		if (laneBRef.current) laneBRef.current.style.transform = 'translate3d(0,0,0)'
	}, [coins])

	const renderItem = (coin: string, i: number) => (
		<span
			key={`${coin}-${i}`}
			data-coin={coin}
			className="inline-flex h-full w-[144px] shrink-0 items-center justify-between gap-0.5 px-2 text-xs font-medium text-(--text-primary) transition-colors duration-300"
		>
			<span className="w-[48px] shrink-0 text-(--text-label)">{coin}</span>
			<span
				data-price
				className="w-[74px] shrink-0 overflow-hidden text-right font-jetbrains whitespace-nowrap tabular-nums"
			>
				--
			</span>
		</span>
	)

	return (
		<div className="overflow-hidden rounded-lg border border-(--cards-border) bg-(--cards-bg)">
			<div ref={viewportRef} className="relative h-10 overflow-hidden">
				<div
					ref={laneARef}
					className="absolute top-0 left-0 inline-flex h-10 transform-gpu items-center will-change-transform [backface-visibility:hidden]"
					aria-hidden
				>
					{coins.map((c, i) => renderItem(c, i))}
				</div>
				<div
					ref={laneBRef}
					className="absolute top-0 left-0 inline-flex h-10 transform-gpu items-center will-change-transform [backface-visibility:hidden]"
					aria-hidden
				>
					{coins.map((c, i) => renderItem(c, coins.length + i))}
				</div>
			</div>
		</div>
	)
}

function MetricCard({ label, value, helper }: { label: string; value: string | number | null; helper?: string }) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<span className="text-xs font-medium tracking-wide text-(--text-label)">{label}</span>
			<span className="text-2xl font-semibold text-(--text-primary)">{value != null ? value : '—'}</span>
			{helper ? <span className="text-[11px] text-(--text-label)">{helper}</span> : null}
		</div>
	)
}

function FundingChart({ data }: { data: { name: string; value: number }[] }) {
	const id = useId()

	useEffect(() => {
		const dom = document.getElementById(id)
		if (!dom || data.length === 0) return

		let instance = echarts.getInstanceByDom(dom)
		if (!instance) instance = echarts.init(dom)

		const sorted = [...data].sort((a, b) => a.value - b.value)

		instance.setOption({
			grid: { left: 70, right: 16, top: 8, bottom: 8, containLabel: false },
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				formatter: (params: any) => {
					const p = params[0]
					return `<b>${p.name}</b><br/>Funding (ann.): ${p.value >= 0 ? '+' : ''}${p.value.toFixed(2)}%`
				}
			},
			xAxis: {
				type: 'value',
				axisLabel: { formatter: '{value}%', color: '#6e727c', fontSize: 11 },
				splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } }
			},
			yAxis: {
				type: 'category',
				data: sorted.map((d) => d.name),
				axisLabel: { color: '#cdd0d5', fontSize: 11 },
				axisLine: { show: false },
				axisTick: { show: false }
			},
			series: [
				{
					type: 'bar',
					data: sorted.map((d) => ({
						value: d.value,
						itemStyle: {
							color: d.value >= 0 ? '#10b981' : '#ef4444'
						}
					})),
					barMaxWidth: 18
				}
			],
			animation: false
		})

		const onResize = () => instance?.resize()
		window.addEventListener('resize', onResize)
		return () => {
			window.removeEventListener('resize', onResize)
			instance?.dispose()
		}
	}, [id, data])

	if (data.length === 0) return null

	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">Funding Rates (Annualized) — Top 20 by OI</h3>
			<div id={id} style={{ width: '100%', height: `${Math.max(300, data.length * 28)}px` }} />
		</div>
	)
}

function Pagination({ table }: { table: ReturnType<typeof useReactTable<any>> }) {
	const { pageIndex, pageSize } = table.getState().pagination
	const total = table.getFilteredRowModel().rows.length
	const from = total === 0 ? 0 : pageIndex * pageSize + 1
	const to = Math.min((pageIndex + 1) * pageSize, total)

	return (
		<div className="flex items-center justify-between pt-3">
			<span className="text-xs text-(--text-label)">
				{from}–{to} of {total}
			</span>
			<div className="flex gap-1">
				<button
					onClick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
					className="rounded px-2.5 py-1 text-xs font-medium text-(--text-label) transition-colors hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent"
				>
					Prev
				</button>
				<button
					onClick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
					className="rounded px-2.5 py-1 text-xs font-medium text-(--text-label) transition-colors hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent"
				>
					Next
				</button>
			</div>
		</div>
	)
}

const perpColumns: ColumnDef<PerpMarket>[] = [
	{
		header: 'Asset',
		accessorKey: 'name',
		cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
		size: 100
	},
	{
		header: 'Price',
		accessorKey: 'markPx',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 120
	},
	{
		header: 'Oracle',
		accessorKey: 'oraclePx',
		cell: ({ getValue }) => {
			const value = getValue<number | undefined>()
			return value ? formattedNum(value, true) : '—'
		},
		meta: { align: 'end' as const },
		size: 120
	},
	{
		header: 'Basis',
		id: 'basis',
		accessorFn: (row) => {
			if (!row.oraclePx) return null
			return ((row.markPx - row.oraclePx) / row.oraclePx) * 100
		},
		cell: ({ getValue }) => {
			const v = getValue<number | null>()
			if (v == null) return '—'
			const color = v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : ''
			return <span className={color}>{formatPct(v)}</span>
		},
		meta: { align: 'end' as const },
		size: 110
	},
	{
		header: 'Premium',
		accessorKey: 'premium',
		cell: ({ getValue }) => {
			const v = getValue<number | null | undefined>()
			if (v == null) return '—'
			const pct = v * 100
			const color = pct > 0 ? 'text-green-400' : pct < 0 ? 'text-red-400' : ''
			return <span className={color}>{formatPct(pct)}</span>
		},
		meta: { align: 'end' as const },
		size: 110
	},
	{
		header: '24h Volume',
		accessorKey: 'dayNtlVlm',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 140
	},
	{
		header: 'Open Interest',
		accessorKey: 'openInterest',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 140
	},
	{
		header: 'Funding (ann.)',
		accessorKey: 'fundingAnnualized',
		cell: ({ getValue }) => {
			const v = getValue<number>()
			const color = v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : ''
			return <span className={color}>{formatPct(v)}</span>
		},
		meta: { align: 'end' as const },
		size: 130
	}
]

const spotColumns: ColumnDef<SpotMarket>[] = [
	{
		header: 'Pair',
		accessorKey: 'name',
		cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
		size: 140
	},
	{
		header: 'Price',
		accessorKey: 'markPx',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 120
	},
	{
		header: '24h Volume',
		accessorKey: 'dayNtlVlm',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 140
	},
	{
		header: '24h Change',
		accessorKey: 'change24hPct',
		cell: ({ getValue }) => {
			const v = getValue<number>()
			const color = v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : ''
			return <span className={color}>{formatPct(v)}</span>
		},
		meta: { align: 'end' as const },
		size: 110
	}
]

const predictedFundingColumns: ColumnDef<PredictedFunding>[] = [
	{
		header: 'Coin',
		accessorKey: 'coin',
		cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
		size: 100
	},
	{
		header: 'HL Predicted',
		accessorKey: 'hlRate',
		cell: ({ getValue }) => {
			const v = getValue<number | null>()
			if (v == null) return '—'
			const color = v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : ''
			return <span className={color}>{formatPct(v)}</span>
		},
		meta: { align: 'end' as const },
		size: 120
	},
	{
		header: 'Spread (HL − Best CEX)',
		accessorKey: 'spreadToBestCex',
		cell: ({ getValue }) => {
			const v = getValue<number | null>()
			if (v == null) return '—'
			const color = v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : ''
			return <span className={color}>{formatPct(v)}</span>
		},
		meta: { align: 'end' as const },
		size: 170
	},
	{
		header: 'Binance',
		accessorKey: 'binanceRate',
		cell: ({ getValue }) => {
			const v = getValue<number | null>()
			if (v == null) return '—'
			const color = v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : ''
			return <span className={color}>{formatPct(v)}</span>
		},
		meta: { align: 'end' as const },
		size: 110
	},
	{
		header: 'Bybit',
		accessorKey: 'bybitRate',
		cell: ({ getValue }) => {
			const v = getValue<number | null>()
			if (v == null) return '—'
			const color = v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : ''
			return <span className={color}>{formatPct(v)}</span>
		},
		meta: { align: 'end' as const },
		size: 110
	},
	{
		header: 'Next Funding',
		accessorKey: 'nextFundingTime',
		cell: ({ getValue }) => formatTimestamp(getValue<number | null>()),
		size: 180
	}
]

function OIDistributionChart({ data }: { data: { name: string; value: number }[] }) {
	const id = useId()

	useEffect(() => {
		const dom = document.getElementById(id)
		if (!dom || data.length === 0) return

		let instance = echarts.getInstanceByDom(dom)
		if (!instance) instance = echarts.init(dom)

		const colors = ['#2172e5', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a78bfa', '#94a3b8']

		instance.setOption({
			tooltip: {
				trigger: 'item',
				formatter: (params: any) =>
					`<b>${params.name}</b><br/>OI: $${formattedNum(params.value)}<br/>${params.percent}%`
			},
			series: [
				{
					type: 'pie',
					radius: ['45%', '70%'],
					center: ['50%', '50%'],
					data: data.map((d, i) => ({
						name: d.name,
						value: d.value,
						itemStyle: { color: colors[i % colors.length] }
					})),
					label: { color: '#cdd0d5', fontSize: 11, formatter: '{b}: {d}%' },
					labelLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
					emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } }
				}
			],
			animation: false
		})

		const onResize = () => instance?.resize()
		window.addEventListener('resize', onResize)
		return () => {
			window.removeEventListener('resize', onResize)
			instance?.dispose()
		}
	}, [data, id])

	if (data.length === 0) return null

	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">Open Interest Distribution</h3>
			<div id={id} style={{ width: '100%', height: '400px' }} />
		</div>
	)
}

function VolumeOIScatter({ data }: { data: PerpMarket[] }) {
	const id = useId()

	useEffect(() => {
		const dom = document.getElementById(id)
		if (!dom || data.length === 0) return
		let instance = echarts.getInstanceByDom(dom)
		if (!instance) instance = echarts.init(dom)

		instance.setOption({
			grid: { left: 80, right: 30, top: 20, bottom: 50, containLabel: false },
			tooltip: {
				trigger: 'item',
				formatter: (params: any) => {
					const d = params.data
					return `<b>${d[3]}</b><br/>Volume: $${formattedNum(d[0])}<br/>OI: $${formattedNum(d[1])}<br/>Funding: ${d[2] >= 0 ? '+' : ''}${d[2].toFixed(2)}%`
				}
			},
			xAxis: {
				type: 'log',
				name: '24h Volume ($)',
				nameLocation: 'center',
				nameGap: 30,
				nameTextStyle: { color: '#6e727c', fontSize: 11 },
				axisLabel: { color: '#6e727c', fontSize: 11 },
				splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } }
			},
			yAxis: {
				type: 'log',
				name: 'Open Interest ($)',
				nameLocation: 'center',
				nameGap: 55,
				nameTextStyle: { color: '#6e727c', fontSize: 11 },
				axisLabel: { color: '#6e727c', fontSize: 11 },
				splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } }
			},
			series: [
				{
					type: 'scatter',
					data: data
						.filter((m) => m.dayNtlVlm > 0 && m.openInterest > 0)
						.map((m) => [m.dayNtlVlm, m.openInterest, m.fundingAnnualized, m.name]),
					symbolSize: (val: number[]) => Math.max(6, Math.min(24, Math.abs(val[2]) * 2)),
					itemStyle: {
						color: (params: any) => (params.data[2] >= 0 ? '#10b981' : '#ef4444'),
						opacity: 0.75
					}
				}
			],
			animation: false
		})

		const onResize = () => instance?.resize()
		window.addEventListener('resize', onResize)
		return () => {
			window.removeEventListener('resize', onResize)
			instance?.dispose()
		}
	}, [id, data])

	if (data.length === 0) return null

	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">
				Volume vs Open Interest (bubble size = funding magnitude)
			</h3>
			<div id={id} style={{ width: '100%', height: '450px' }} />
		</div>
	)
}

function PredictedFundingTable({ data }: { data: PredictedFunding[] }) {
	const [sorting, setSorting] = useState<SortingState>([{ id: 'spreadToBestCex', desc: true }])
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE })

	const instance = useReactTable({
		data,
		columns: predictedFundingColumns,
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
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">
				Predicted Funding Rates (Annualized) — HL vs CEXs
			</h3>
			<VirtualTable instance={instance} skipVirtualization />
			<Pagination table={instance} />
		</div>
	)
}

function PerpsTable({ data }: { data: PerpMarket[] }) {
	const [sorting, setSorting] = useState<SortingState>([{ id: 'dayNtlVlm', desc: true }])
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE })

	const instance = useReactTable({
		data,
		columns: perpColumns,
		state: { sorting, pagination },
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel()
	})

	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">Perpetual Markets</h3>
			<VirtualTable instance={instance} skipVirtualization />
			<Pagination table={instance} />
		</div>
	)
}

function SpotTable({ data }: { data: SpotMarket[] }) {
	const [sorting, setSorting] = useState<SortingState>([{ id: 'dayNtlVlm', desc: true }])
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE })

	const instance = useReactTable({
		data,
		columns: spotColumns,
		state: { sorting, pagination },
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel()
	})

	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">Spot Markets</h3>
			<VirtualTable instance={instance} skipVirtualization />
			<Pagination table={instance} />
		</div>
	)
}

export default function Stats() {
	const { markets: perps, isLoading: perpsLoading } = useHyperliquidPerps()
	const { markets: spot, isLoading: spotLoading } = useHyperliquidSpot()
	const { fundings, isLoading: fundingsLoading } = useHyperliquidPredictedFundings()

	const kpis = useMemo(() => {
		const totalVolume = perps.reduce((sum, market) => sum + market.dayNtlVlm, 0)
		const totalOI = perps.reduce((sum, market) => sum + market.openInterest, 0)

		return {
			totalVolume: formattedNum(totalVolume, true),
			totalOI: formattedNum(totalOI, true),
			perpCount: perps.length,
			spotCount: spot.length
		}
	}, [perps, spot])

	const fundingChartData = useMemo(
		() =>
			[...perps]
				.sort((a, b) => b.openInterest - a.openInterest)
				.slice(0, 20)
				.map((market) => ({ name: market.name, value: market.fundingAnnualized })),
		[perps]
	)

	const topCoins = useMemo(
		() =>
			[...perps]
				.sort((a, b) => b.dayNtlVlm - a.dayNtlVlm)
				.slice(0, 20)
				.map((market) => market.name),
		[perps]
	)

	const oiDistributionData = useMemo(() => {
		if (perps.length === 0) return []
		const sorted = [...perps].sort((a, b) => b.openInterest - a.openInterest)
		const top = sorted.slice(0, 10)
		const otherOI = sorted.slice(10).reduce((sum, market) => sum + market.openInterest, 0)
		const result = top.map((market) => ({ name: market.name, value: market.openInterest }))
		if (otherOI > 0) result.push({ name: 'Other', value: otherOI })
		return result
	}, [perps])

	const isLoading = perpsLoading || spotLoading

	if (isLoading) {
		return (
			<div className="flex flex-1 items-center justify-center py-20">
				<div className="sl-loader text-center leading-none select-none">
					<span className="block text-[13px] font-medium tracking-[0.4em] text-white/40">SUPER</span>
					<span
						className="block text-[34px] font-black tracking-[0.08em] text-transparent"
						style={{ WebkitTextStroke: '1px #00d4ff' }}
					>
						LUMINAL
					</span>
				</div>
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-4">
			{topCoins.length > 0 ? <PriceTickerTape coins={topCoins} /> : null}

			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<MetricCard label="24h Perp Volume" value={kpis.totalVolume} />
				<MetricCard label="Total Open Interest" value={kpis.totalOI} />
				<MetricCard label="Perp Markets" value={kpis.perpCount} />
				<MetricCard label="Spot Markets" value={kpis.spotCount} />
			</div>
			<FundingChart data={fundingChartData} />
			{!fundingsLoading ? <PredictedFundingTable data={fundings} /> : null}

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<OIDistributionChart data={oiDistributionData} />
				<VolumeOIScatter data={perps} />
			</div>

			<PerpsTable data={perps} />
			<SpotTable data={spot} />
		</div>
	)
}
