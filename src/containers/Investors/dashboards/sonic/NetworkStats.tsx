import { useEffect, useRef, useState } from 'react'
import { useContentReady } from '~/containers/Investors/index'
import { useNetworkStatsData } from './networkStatsApi'

interface BurnBlock {
	block_number: number
	timestamp: number
	gas_used: number
	tx_count: number
	base_fee_per_gas_gwei: string
	block_burn_s: string
	total_burned_s: string
}

interface BurnWindow {
	burned_s: string
	window_seconds: number
}

interface BurnStreamState {
	totalBurnedS: number
	blockNumber: number
	recentBlocks: BurnBlock[]
	burnWindows: Record<string, BurnWindow> | null
	connected: boolean
}

function useBurnStream() {
	const [state, setState] = useState<BurnStreamState>({
		totalBurnedS: 0,
		blockNumber: 0,
		recentBlocks: [],
		burnWindows: null,
		connected: false
	})
	const initialized = useRef(false)

	useEffect(() => {
		let es: EventSource | null = null

		try {
			es = new EventSource('/api/sonic/burn-stream')

			es.addEventListener('init', (e) => {
				const data = JSON.parse(e.data)
				initialized.current = true
				setState({
					totalBurnedS: parseFloat(data.total_burned_s),
					blockNumber: data.block_number,
					recentBlocks: (data.recent_blocks || []).slice(0, 15),
					burnWindows: data.burn_windows || null,
					connected: true
				})
			})

			es.addEventListener('block', (e) => {
				const block: BurnBlock = JSON.parse(e.data)
				setState((prev) => ({
					...prev,
					totalBurnedS: parseFloat(block.total_burned_s),
					blockNumber: block.block_number,
					recentBlocks: [block, ...prev.recentBlocks.slice(0, 14)]
				}))
			})

			es.onerror = () => {
				setState((prev) => ({ ...prev, connected: false }))
			}
		} catch {
			// EventSource not supported or connection failed
		}

		return () => {
			es?.close()
		}
	}, [])

	return state
}

function formatBurnValue(s: string | number): string {
	const n = typeof s === 'string' ? parseFloat(s) : s
	if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
	if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`
	if (n >= 1) return n.toFixed(2)
	return n.toFixed(6)
}

function formatGas(n: number): string {
	if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
	if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
	return n.toLocaleString('en-US')
}

function timeAgo(ts: number): string {
	const diff = Math.floor(Date.now() / 1000) - ts
	if (diff < 5) return 'just now'
	if (diff < 60) return `${diff}s ago`
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
	return `${Math.floor(diff / 3600)}h ago`
}

function SectionHeader({ children }: { children: React.ReactNode }) {
	return <h2 className="text-xs font-semibold tracking-wider text-(--text-label) uppercase">{children}</h2>
}

function BurnCounter({ totalBurnedS, price }: { totalBurnedS: number; price: number | null }) {
	const [displayValue, setDisplayValue] = useState(totalBurnedS)
	const animRef = useRef<number>(0)
	const targetRef = useRef(totalBurnedS)

	useEffect(() => {
		targetRef.current = totalBurnedS
		const start = displayValue
		const diff = totalBurnedS - start
		if (Math.abs(diff) < 1e-10) return

		const duration = 400
		const startTime = performance.now()

		const animate = (now: number) => {
			const elapsed = now - startTime
			const progress = Math.min(elapsed / duration, 1)
			// ease-out-quart
			const eased = 1 - Math.pow(1 - progress, 4)
			setDisplayValue(start + diff * eased)
			if (progress < 1) {
				animRef.current = requestAnimationFrame(animate)
			}
		}

		cancelAnimationFrame(animRef.current)
		animRef.current = requestAnimationFrame(animate)

		return () => cancelAnimationFrame(animRef.current)
	}, [totalBurnedS]) // eslint-disable-line react-hooks/exhaustive-deps

	const parts = displayValue.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).split('.')
	const intPart = parts[0]
	const decPart = parts[1]

	return (
		<div>
			<div className="text-4xl font-bold tabular-nums text-(--text-primary) sm:text-5xl">
				{intPart}
				<span className="text-(--text-secondary)">.{decPart}</span>
				<span className="ml-2 text-xl font-semibold text-(--text-label)">S</span>
			</div>
			{price != null && displayValue > 0 && (
				<span className="mt-1 block text-sm tabular-nums text-(--text-label)">
					${(displayValue * price).toLocaleString('en-US', { maximumFractionDigits: 0 })} USD
				</span>
			)}
		</div>
	)
}

export default function NetworkStats() {
	const { data, isLoading } = useNetworkStatsData()
	const stream = useBurnStream()
	const onContentReady = useContentReady()

	useEffect(() => {
		if (data && !isLoading) {
			onContentReady()
		}
	}, [data, isLoading, onContentReady])

	if (isLoading || !data) {
		return null
	}

	const burnWindows = stream.burnWindows
	const liveBlock = stream.blockNumber || data.network.blockNumber?.value

	return (
		<div className="flex flex-col gap-6">
			{/* Live Burn Counter */}
			<div className="rounded-xl border border-(--cards-border) bg-(--cards-bg) p-6">
				<div className="flex items-start justify-between gap-4">
					<div>
						<div className="flex items-center gap-3">
							<span className="text-xs font-semibold tracking-wider text-(--text-label) uppercase">
								Total S Burned
							</span>
							{stream.connected && (
								<span className="flex items-center gap-1.5 text-[11px] text-green-500">
									<span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
									Live
								</span>
							)}
						</div>
						<div className="mt-3">
							<BurnCounter
								totalBurnedS={stream.totalBurnedS}
								price={data.network.price?.value ?? null}
							/>
						</div>
					</div>
				</div>

				{burnWindows && (
					<div className="mt-5 flex flex-wrap gap-3">
						{(['1h', '24h', '7d', '30d'] as const).map((key) => {
							const w = burnWindows[key]
							if (!w) return null
							return (
								<div key={key} className="flex items-baseline gap-1.5 rounded-md border border-(--cards-border) px-3 py-1.5">
									<span className="text-xs text-(--text-label)">{key}</span>
									<span className="text-sm font-semibold tabular-nums text-(--text-primary)">
										{formatBurnValue(w.burned_s)} S
									</span>
								</div>
							)
						})}
					</div>
				)}
			</div>

			{/* Network Vitals */}
			<div className="flex flex-col gap-4">
				<SectionHeader>Network</SectionHeader>
				<div className="grid grid-cols-3 gap-4">
					<div className="flex flex-col gap-1 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
						<span className="text-xs font-medium tracking-wide text-(--text-label)">Latest Block</span>
						<span className="text-2xl font-semibold tabular-nums text-(--text-primary)">
							{liveBlock ? liveBlock.toLocaleString('en-US') : '—'}
						</span>
					</div>
					{data.network.gasPrice && (
						<div className="flex flex-col gap-1 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
							<span className="text-xs font-medium tracking-wide text-(--text-label)">Gas Price</span>
							<span className="text-2xl font-semibold text-(--text-primary)">{data.network.gasPrice.formatted}</span>
						</div>
					)}
					{data.network.price && (
						<div className="flex flex-col gap-1 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
							<span className="text-xs font-medium tracking-wide text-(--text-label)">S Price</span>
							<span className="text-2xl font-semibold text-(--text-primary)">{data.network.price.formatted}</span>
						</div>
					)}
					</div>
			</div>

			{/* Recent Blocks */}
			{stream.recentBlocks.length > 0 && (
				<div className="flex flex-col gap-4">
					<SectionHeader>Recent Blocks</SectionHeader>
					<div className="overflow-x-auto rounded-lg border border-(--cards-border) bg-(--cards-bg)">
						<table className="w-full">
							<thead>
								<tr className="border-b border-(--cards-border)">
									<th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-(--text-label) uppercase">
										Block
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-(--text-label) uppercase">
										Txs
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-(--text-label) uppercase">
										Gas Used
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-(--text-label) uppercase">
										Burned
									</th>
									<th className="hidden px-4 py-3 text-right text-xs font-semibold tracking-wide text-(--text-label) uppercase sm:table-cell">
										Time
									</th>
								</tr>
							</thead>
							<tbody>
								{stream.recentBlocks.map((block) => (
									<tr
										key={block.block_number}
										className="border-b border-(--cards-border) last:border-b-0 hover:bg-(--sl-hover-bg)"
									>
										<td className="px-4 py-2.5 text-sm font-medium tabular-nums text-(--text-primary)">
											{block.block_number.toLocaleString('en-US')}
										</td>
										<td className="px-4 py-2.5 text-sm tabular-nums text-(--text-primary)">{block.tx_count}</td>
										<td className="px-4 py-2.5 text-sm tabular-nums text-(--text-primary)">
											{formatGas(block.gas_used)}
										</td>
										<td className="px-4 py-2.5 text-sm tabular-nums text-(--text-primary)">
											{parseFloat(block.block_burn_s).toFixed(6)} S
										</td>
										<td className="hidden px-4 py-2.5 text-right text-xs text-(--text-label) sm:table-cell">
											{timeAgo(block.timestamp)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Fees & Epoch */}
			{(data.fees || data.epoch) && (
				<div className="flex flex-col gap-4">
					<SectionHeader>Fees & Epoch</SectionHeader>
					<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg)">
						<div className="flex flex-col divide-y divide-(--cards-border)">
							{data.fees && (
								<>
									<InfoRow label="Fees / Day" value={data.fees.feesPerDay.formatted} />
									<InfoRow label="FeeM / Day" value={data.fees.feeMPerDay.formatted} />
									<InfoRow label="Validator Fees / Day" value={data.fees.validatorFeesPerDay.formatted} />
									<InfoRow label="Burn Rate" value={data.fees.burnRate.formatted} />
								</>
							)}
							{data.epoch && (
								<>
									<InfoRow label="Current Epoch" value={data.epoch.current.formatted} />
									<InfoRow label="Avg Epoch Duration" value={data.epoch.avgDuration.formatted} />
								</>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Uptime Link */}
			<a
				href={data.uptimeUrl}
				target="_blank"
				rel="noopener noreferrer"
				className="group flex items-center justify-between rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4 transition-colors hover:bg-(--sl-hover-bg)"
			>
				<div>
					<span className="text-sm font-medium text-(--text-primary)">Network Uptime</span>
					<span className="ml-2 text-xs text-(--text-label)">uptime.soniclabs.com</span>
				</div>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					className="h-4 w-4 text-(--text-label) transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
				>
					<path d="M7 17L17 7M17 7H7M17 7v10" />
				</svg>
			</a>
		</div>
	)
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between px-4 py-3">
			<span className="text-sm text-(--text-label)">{label}</span>
			<span className="text-sm font-semibold tabular-nums text-(--text-primary)">{value}</span>
		</div>
	)
}
