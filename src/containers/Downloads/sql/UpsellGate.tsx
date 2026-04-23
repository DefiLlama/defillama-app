import * as Ariakit from '@ariakit/react'
import { lazy, Suspense, useState, type ReactNode } from 'react'
import { Icon } from '~/components/Icon'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

interface UpsellGateProps {
	isAuthenticated: boolean
	isTrial: boolean
	topRight?: ReactNode
}

const SAMPLE_ROWS = [
	{ name: 'Aave', category: 'Lending', fees_30d: 64_420_133, tvl: 14_900_000_000 },
	{ name: 'Hyperliquid', category: 'Perps', fees_30d: 41_012_500, tvl: 2_140_000_000 },
	{ name: 'Uniswap', category: 'Dexs', fees_30d: 38_804_610, tvl: 5_310_000_000 },
	{ name: 'Raydium', category: 'Dexs', fees_30d: 21_440_020, tvl: 1_780_000_000 }
]

const BENEFITS = [
	{ title: 'Cross-dataset joins', body: 'Join fees, TVL, revenue, and more in a single query.' },
	{ title: 'Full LlamaSQL dialect', body: 'Rolling windows, ranks, CTEs — 100% standard SQL support.' },
	{ title: 'Runs in your browser', body: 'LlamaSQL compiles locally — no extra API cost, no rate limits.' },
	{ title: 'Export anywhere', body: 'Download results as CSV, Parquet, or Arrow for your own stack.' }
]

export function UpsellGate({ isAuthenticated, isTrial, topRight }: UpsellGateProps) {
	const [open, setOpen] = useState(false)
	const dialogStore = Ariakit.useDialogStore({ open, setOpen })

	const heading = isTrial
		? 'SQL workspace — upgrade from trial'
		: isAuthenticated
			? 'Unlock the SQL workspace'
			: 'Sign in to unlock SQL'

	const copy = isTrial
		? 'Your trial includes preview-only CSV downloads. Upgrade to run SQL queries across the full DefiLlama catalogue in your browser.'
		: isAuthenticated
			? 'Upgrade to run SQL queries across every DefiLlama dataset in your browser — no API cost, arbitrary joins, full LlamaSQL dialect.'
			: 'Sign in with a paid plan to run SQL queries across every DefiLlama dataset in your browser.'

	return (
		<div className="flex flex-col gap-4">
			{topRight ? <div className="flex justify-end">{topRight}</div> : null}

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-8">
				<SamplePane />

				<div className="flex flex-col justify-between gap-6">
					<div className="flex flex-col gap-3">
						<span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-(--primary)/40 bg-(--primary)/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-(--primary) uppercase">
							<Icon name="star" className="h-3 w-3" />
							Pro feature
						</span>
						<h2 className="text-2xl leading-tight font-semibold text-(--text-primary)">{heading}</h2>
						<p className="max-w-md text-sm leading-relaxed text-(--text-secondary)">{copy}</p>
					</div>

					<ul className="flex flex-col divide-y divide-(--divider)/70 border-y border-(--divider)/70">
						{BENEFITS.map((b) => (
							<li key={b.title} className="flex items-start gap-3 py-3">
								<Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0 text-(--primary)" />
								<div className="flex flex-col gap-0.5">
									<span className="text-sm font-semibold text-(--text-primary)">{b.title}</span>
									<span className="text-xs text-(--text-secondary)">{b.body}</span>
								</div>
							</li>
						))}
					</ul>

					<div className="flex flex-col gap-2">
						<button
							type="button"
							onClick={() => setOpen(true)}
							className="inline-flex items-center justify-center gap-2 rounded-md bg-(--primary) px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-90"
						>
							<Icon name="star" className="h-4 w-4" />
							{isAuthenticated ? 'Upgrade to Pro' : 'Subscribe'}
						</button>
						<p className="text-xs text-(--text-tertiary)">
							Compute runs locally via LlamaSQL — no additional API cost.
						</p>
					</div>
				</div>
			</div>

			{open ? (
				<Suspense fallback={null}>
					<SubscribeProModal dialogStore={dialogStore} />
				</Suspense>
			) : null}
		</div>
	)
}

function SamplePane() {
	return (
		<div className="flex flex-col gap-3 rounded-lg border border-(--divider) bg-(--cards-bg) p-4">
			<div className="flex items-center justify-between text-xs">
				<span className="font-semibold text-(--text-secondary)">Sample query</span>
				<span className="flex items-center gap-1.5 text-(--text-tertiary)">
					<span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-pro-green-300" />
					<span className="tabular-nums">182ms · 4 rows</span>
				</span>
			</div>

			<pre className="overflow-x-auto rounded-md border border-(--divider) bg-(--app-bg)/60 p-3 font-mono text-[11.5px] leading-relaxed text-(--text-primary)">
				<code>
					<span className="text-(--primary)">SELECT</span> f.name, f.category,{'\n'}
					{'       '}f.total30d <span className="text-(--primary)">AS</span> fees_30d, p.tvl{'\n'}
					<span className="text-(--primary)">FROM</span> fees f{'\n'}
					<span className="text-(--primary)">JOIN</span> protocols p <span className="text-(--primary)">ON</span> p.name
					= f.name{'\n'}
					<span className="text-(--primary)">WHERE</span> f.total30d &gt;{' '}
					<span className="text-pro-green-300">10_000_000</span>
					{'\n'}
					<span className="text-(--primary)">ORDER BY</span> fees_30d <span className="text-(--primary)">DESC</span>
					{'\n'}
					<span className="text-(--primary)">LIMIT</span> <span className="text-pro-green-300">4</span>;
				</code>
			</pre>

			<div className="overflow-hidden rounded-md border border-(--divider)">
				<div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-(--divider) bg-(--app-bg)/40 text-[11px] font-semibold text-(--text-secondary)">
					<HeaderCell>name</HeaderCell>
					<HeaderCell>category</HeaderCell>
					<HeaderCell align="right">fees_30d</HeaderCell>
					<HeaderCell align="right">tvl</HeaderCell>
				</div>
				{SAMPLE_ROWS.map((r, i) => (
					<div
						key={r.name}
						className={`grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-(--divider)/50 last:border-b-0 ${
							i % 2 === 1 ? 'bg-(--app-bg)/20' : ''
						}`}
					>
						<Cell>{r.name}</Cell>
						<Cell muted>{r.category}</Cell>
						<Cell align="right">{r.fees_30d.toLocaleString()}</Cell>
						<Cell align="right">{formatUsd(r.tvl)}</Cell>
					</div>
				))}
			</div>
		</div>
	)
}

function HeaderCell({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
	return <span className={`px-2.5 py-1.5 ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</span>
}

function Cell({
	children,
	align = 'left',
	muted = false
}: {
	children: ReactNode
	align?: 'left' | 'right'
	muted?: boolean
}) {
	return (
		<span
			className={`truncate px-2.5 py-1 font-mono text-[11.5px] tabular-nums ${
				align === 'right' ? 'text-right' : 'text-left'
			} ${muted ? 'text-(--text-tertiary)' : 'text-(--text-primary)'}`}
		>
			{children}
		</span>
	)
}

function formatUsd(n: number): string {
	if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
	return n.toLocaleString()
}
