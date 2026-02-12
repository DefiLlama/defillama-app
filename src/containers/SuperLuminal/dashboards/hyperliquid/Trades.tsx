import { useEffect, useMemo, useState } from 'react'
import { formattedNum } from '~/utils'
import { pushBounded, useHyperliquidL2Book, useHyperliquidPerps, useHyperliquidWsChannels, type WsSubscription } from './api'

interface Trade {
	coin: string
	side: 'B' | 'A' | 'S'
	px: number
	sz: number
	time: number
	tid: number
}

interface BookLevel {
	px: number
	sz: number
	n: number
}

const BOOK_LEVELS = 15
const MAX_TRADES = 300

function formatTime(ts: number) {
	const d = new Date(ts)
	return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function toBookLevel(level: { px: string | number; sz: string | number; n: number }): BookLevel {
	return {
		px: Number(level.px) || 0,
		sz: Number(level.sz) || 0,
		n: Number(level.n) || 0
	}
}

function LiveOrderBook({ bids, asks }: { bids: BookLevel[]; asks: BookLevel[] }) {
	const topBids = bids.slice(0, BOOK_LEVELS)
	const topAsks = asks.slice(0, BOOK_LEVELS)

	const maxSize = useMemo(() => {
		const allSizes = [...topBids, ...topAsks].map((level) => level.sz)
		return Math.max(...allSizes, 1)
	}, [topBids, topAsks])

	const bestBid = topBids[0]?.px ?? 0
	const bestAsk = topAsks[0]?.px ?? 0
	const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : 0
	const spread = bestBid && bestAsk && midPrice > 0 ? ((bestAsk - bestBid) / midPrice) * 100 : 0

	const reversedAsks = [...topAsks].reverse()

	return (
		<div className="flex flex-col rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">Order Book</h3>

			<div className="mb-2 grid grid-cols-3 text-[11px] font-medium text-(--text-label)">
				<span>Price</span>
				<span className="text-right">Size</span>
				<span className="text-right">Orders</span>
			</div>

			<div className="flex flex-col font-mono text-xs">
				{reversedAsks.map((level, i) => {
					const pct = (level.sz / maxSize) * 100
					return (
						<div key={`a-${i}`} className="relative grid grid-cols-3 py-[3px]">
							<div className="absolute inset-y-0 right-0 bg-red-500/10" style={{ width: `${pct}%` }} />
							<span className="relative text-red-400">{level.px.toLocaleString()}</span>
							<span className="relative text-right text-(--text-primary)">{formattedNum(level.sz)}</span>
							<span className="relative text-right text-(--text-label)">{level.n}</span>
						</div>
					)
				})}

				{midPrice > 0 && (
					<div className="my-1 flex items-center justify-center gap-2 border-y border-(--cards-border) py-2">
						<span className="text-sm font-semibold text-(--text-primary)">{formattedNum(midPrice, true)}</span>
						<span className="text-[10px] text-(--text-label)">Spread: {spread.toFixed(4)}%</span>
					</div>
				)}

				{topBids.map((level, i) => {
					const pct = (level.sz / maxSize) * 100
					return (
						<div key={`b-${i}`} className="relative grid grid-cols-3 py-[3px]">
							<div className="absolute inset-y-0 right-0 bg-green-500/10" style={{ width: `${pct}%` }} />
							<span className="relative text-green-400">{level.px.toLocaleString()}</span>
							<span className="relative text-right text-(--text-primary)">{formattedNum(level.sz)}</span>
							<span className="relative text-right text-(--text-label)">{level.n}</span>
						</div>
					)
				})}
			</div>

			{bids.length === 0 && asks.length === 0 ? (
				<div className="flex flex-1 items-center justify-center py-10 text-sm text-(--text-label)">
					Waiting for order book data...
				</div>
			) : null}
		</div>
	)
}

function LiveTradeFeed({ trades }: { trades: Trade[] }) {
	return (
		<div className="flex max-h-[800px] flex-col rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 shrink-0 text-sm font-medium text-(--text-label)">Recent Trades</h3>

			<div className="mb-2 grid shrink-0 grid-cols-4 text-[11px] font-medium text-(--text-label)">
				<span>Time</span>
				<span className="text-right">Price</span>
				<span className="text-right">Size</span>
				<span className="text-right">Side</span>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto font-mono text-xs">
				{trades.map((trade) => {
					const isBuy = trade.side === 'B'
					return (
						<div
							key={`${trade.tid}-${trade.time}`}
							className={`grid grid-cols-4 py-[3px] ${isBuy ? 'text-green-400' : 'text-red-400'}`}
						>
							<span className="text-(--text-label)">{formatTime(trade.time)}</span>
							<span className="text-right">{trade.px.toLocaleString()}</span>
							<span className="text-right">{formattedNum(trade.sz)}</span>
							<span className="text-right font-medium">{isBuy ? 'Buy' : 'Sell'}</span>
						</div>
					)
				})}
				{trades.length === 0 ? (
					<div className="flex items-center justify-center py-10 text-sm text-(--text-label)">
						Waiting for trades...
					</div>
				) : null}
			</div>
		</div>
	)
}

function MetricStrip({
	spreadPct,
	buyRatio1m,
	buyRatio5m,
	cvd5m,
	depth025,
	depth1
}: {
	spreadPct: number
	buyRatio1m: number
	buyRatio5m: number
	cvd5m: number
	depth025: number
	depth1: number
}) {
	return (
		<div className="grid grid-cols-2 gap-3 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4 md:grid-cols-6">
			<div>
				<div className="text-[11px] text-(--text-label)">Spread</div>
				<div className="text-sm text-(--text-primary)">{spreadPct.toFixed(4)}%</div>
			</div>
			<div>
				<div className="text-[11px] text-(--text-label)">Buy Ratio 1m</div>
				<div className="text-sm text-(--text-primary)">{(buyRatio1m * 100).toFixed(1)}%</div>
			</div>
			<div>
				<div className="text-[11px] text-(--text-label)">Buy Ratio 5m</div>
				<div className="text-sm text-(--text-primary)">{(buyRatio5m * 100).toFixed(1)}%</div>
			</div>
			<div>
				<div className="text-[11px] text-(--text-label)">CVD 5m</div>
				<div className={cvd5m >= 0 ? 'text-sm text-green-400' : 'text-sm text-red-400'}>{formattedNum(cvd5m)}</div>
			</div>
			<div>
				<div className="text-[11px] text-(--text-label)">Depth ±0.25%</div>
				<div className="text-sm text-(--text-primary)">{formattedNum(depth025, true)}</div>
			</div>
			<div>
				<div className="text-[11px] text-(--text-label)">Depth ±1%</div>
				<div className="text-sm text-(--text-primary)">{formattedNum(depth1, true)}</div>
			</div>
		</div>
	)
}

export default function Trades() {
	const { markets } = useHyperliquidPerps()
	const [coin, setCoin] = useState('BTC')
	const [nSigFigs, setNSigFigs] = useState(5)
	const [trades, setTrades] = useState<Trade[]>([])
	const [book, setBook] = useState<{ bids: BookLevel[]; asks: BookLevel[] }>({ bids: [], asks: [] })

	const { book: snapshotBook } = useHyperliquidL2Book(coin, nSigFigs)

	const coinOptions = useMemo(
		() => [...markets].sort((a, b) => b.dayNtlVlm - a.dayNtlVlm).map((market) => market.name),
		[markets]
	)

	useEffect(() => {
		setTrades([])
		setBook({ bids: [], asks: [] })
	}, [coin, nSigFigs])

	useEffect(() => {
		if (!snapshotBook) return
		setBook({ bids: snapshotBook.levels[0], asks: snapshotBook.levels[1] })
	}, [snapshotBook])

	const subs: WsSubscription[] = useMemo(
		() => [
			{ type: 'trades', coin },
			{ type: 'l2Book', coin, nSigFigs }
		],
		[coin, nSigFigs]
	)

	const { isConnected } = useHyperliquidWsChannels(subs, {
		trades: (message) => {
			const incoming = (message.data ?? []) as Array<{
				coin: string
				side: 'B' | 'A' | 'S'
				px: string
				sz: string
				time: number
				tid: number
			}>
			if (!Array.isArray(incoming) || incoming.length === 0) return
			const mapped = incoming.map((trade) => ({
				coin: trade.coin,
				side: trade.side,
				px: Number(trade.px) || 0,
				sz: Number(trade.sz) || 0,
				time: trade.time,
				tid: trade.tid
			}))
			setTrades((prev) => pushBounded(prev, mapped, MAX_TRADES))
		},
		l2Book: (message) => {
			const levels = message.data?.levels as
				| [Array<{ px: string; sz: string; n: number }>, Array<{ px: string; sz: string; n: number }>]
				| undefined
			if (!levels) return
			setBook({
				bids: (levels[0] ?? []).map(toBookLevel),
				asks: (levels[1] ?? []).map(toBookLevel)
			})
		}
	})

	const metrics = useMemo(() => {
		const bestBid = book.bids[0]?.px ?? 0
		const bestAsk = book.asks[0]?.px ?? 0
		const mid = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : 0
		const spreadPct = bestBid && bestAsk && mid > 0 ? ((bestAsk - bestBid) / mid) * 100 : 0

		const now = Date.now()
		const oneMinute = now - 60_000
		const fiveMinute = now - 5 * 60_000

		let buy1m = 0
		let sell1m = 0
		let buy5m = 0
		let sell5m = 0
		for (const trade of trades) {
			if (trade.time >= oneMinute) {
				if (trade.side === 'B') buy1m += trade.sz
				else sell1m += trade.sz
			}
			if (trade.time >= fiveMinute) {
				if (trade.side === 'B') buy5m += trade.sz
				else sell5m += trade.sz
			}
		}

		const buyRatio1m = buy1m + sell1m > 0 ? buy1m / (buy1m + sell1m) : 0
		const buyRatio5m = buy5m + sell5m > 0 ? buy5m / (buy5m + sell5m) : 0
		const cvd5m = buy5m - sell5m

		const depth = (bandPct: number) => {
			if (!mid) return 0
			const lower = mid * (1 - bandPct)
			const upper = mid * (1 + bandPct)
			const bidNotional = book.bids
				.filter((level) => level.px >= lower)
				.reduce((sum, level) => sum + level.px * level.sz, 0)
			const askNotional = book.asks
				.filter((level) => level.px <= upper)
				.reduce((sum, level) => sum + level.px * level.sz, 0)
			return bidNotional + askNotional
		}

		return {
			spreadPct,
			buyRatio1m,
			buyRatio5m,
			cvd5m,
			depth025: depth(0.0025),
			depth1: depth(0.01)
		}
	}, [book.asks, book.bids, trades])

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-3">
				<select
					value={coin}
					onChange={(e) => setCoin(e.target.value)}
					className="rounded-lg border border-(--cards-border) bg-(--cards-bg) px-3 py-2 text-sm font-medium text-(--text-primary) outline-none"
				>
					{coinOptions.length > 0
						? coinOptions.map((value) => (
								<option key={value} value={value}>
									{value}
								</option>
							))
						: ['BTC', 'ETH', 'SOL'].map((value) => (
								<option key={value} value={value}>
									{value}
								</option>
							))}
				</select>

				<select
					value={nSigFigs}
					onChange={(e) => setNSigFigs(Number(e.target.value))}
					className="rounded-lg border border-(--cards-border) bg-(--cards-bg) px-3 py-2 text-sm font-medium text-(--text-primary) outline-none"
				>
					{[2, 3, 4, 5].map((value) => (
						<option key={value} value={value}>
							Depth nSigFigs: {value}
						</option>
					))}
				</select>

				<div className="ml-auto flex items-center gap-1.5">
					<div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
					<span className="text-xs text-(--text-label)">{isConnected ? 'Connected' : 'Reconnecting...'}</span>
				</div>
			</div>

			<MetricStrip {...metrics} />

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<LiveOrderBook bids={book.bids} asks={book.asks} />
				<LiveTradeFeed trades={trades.slice(0, 120)} />
			</div>
		</div>
	)
}
