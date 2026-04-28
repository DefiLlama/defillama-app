import Link from 'next/link'
import { useRouter } from 'next/router'
import { type ReactNode } from 'react'
import { Icon, type IIcon } from '~/components/Icon'
import { Keycap, TypeBadge, type ColumnKind } from './primitives'

interface UpsellGateProps {
	isAuthenticated: boolean
	isTrial: boolean
	topRight?: ReactNode
}

const FEATURES: { icon: IIcon['name']; title: string; body: string }[] = [
	{
		icon: 'flame',
		title: 'In-browser engine',
		body: 'DuckDB-WASM runs locally — sub-second queries on millions of rows, no servers.'
	},
	{
		icon: 'layers',
		title: '100+ datasets',
		body: 'TVL, fees, yields, stablecoins, hacks, raises, ETFs, bridges — auto-loaded on reference.'
	},
	{
		icon: 'bar-chart-2',
		title: '13 chart types',
		body: 'Line, bar, area, pie, treemap, scatter, candlestick — auto-rendered from any result.'
	},
	{
		icon: 'graduation-cap',
		title: 'Notebooks + playbook',
		body: 'Mix SQL, markdown, and charts in one notebook. 30+ ready-to-run example queries.'
	},
	{
		icon: 'layout-grid',
		title: 'Multi-tab + shortcuts',
		body: 'Cmd+T new tab, Cmd+Enter run, Cmd+1–9 jump — IDE-grade keyboard navigation.'
	},
	{
		icon: 'link',
		title: 'Share & export',
		body: 'Encode any query or notebook to a URL anyone can open. Export results to CSV or JSON.'
	}
]

const PLAN_INCLUDES = [
	'Full SQL Studio access (this page)',
	'1,000 req/min API rate limit',
	'1M API calls per month',
	'Premium endpoints + MCP integration',
	'Everything in the Pro plan'
]

interface SampleRow {
	name: string
	category: string
	fees_30d: number
	revenue_30d: number
	keep_ratio: number
	short: string
}

const SAMPLE_ROWS: SampleRow[] = [
	{ name: 'Uniswap V4', category: 'Dexs', fees_30d: 21_801_514, revenue_30d: 0, keep_ratio: 0, short: 'Uniswap V4' },
	{
		name: 'Ethena USDe',
		category: 'Basis Trading',
		fees_30d: 17_544_600,
		revenue_30d: 208_477,
		keep_ratio: 0.011883,
		short: 'Ethena'
	},
	{
		name: 'Morpho Blue',
		category: 'Lending',
		fees_30d: 13_982_470,
		revenue_30d: 0,
		keep_ratio: 0,
		short: 'Morpho'
	},
	{
		name: 'Spark Liquidity Layer',
		category: 'Onchain Capital Allocator',
		fees_30d: 11_329_710,
		revenue_30d: 500_636,
		keep_ratio: 0.044188,
		short: 'Spark'
	},
	{
		name: 'Hyper Foundation HYPE Staking',
		category: 'Staking Pool',
		fees_30d: 7_897_307,
		revenue_30d: 236_919,
		keep_ratio: 0.03,
		short: 'Hyper'
	},
	{
		name: 'Grove Finance',
		category: 'Onchain Capital Allocator',
		fees_30d: 6_492_198,
		revenue_30d: 0,
		keep_ratio: 0,
		short: 'Grove'
	},
	{
		name: 'Aster Perps',
		category: 'Derivatives',
		fees_30d: 6_346_500,
		revenue_30d: 0,
		keep_ratio: 0,
		short: 'Aster'
	}
]

interface SampleCol {
	name: keyof Omit<SampleRow, 'short'>
	kind: ColumnKind
	type: string
	width: number
}

const SAMPLE_COLS: SampleCol[] = [
	{ name: 'name', kind: 'text', type: 'VARCHAR', width: 192 },
	{ name: 'category', kind: 'text', type: 'VARCHAR', width: 188 },
	{ name: 'fees_30d', kind: 'float', type: 'BIGINT', width: 132 },
	{ name: 'revenue_30d', kind: 'float', type: 'BIGINT', width: 132 },
	{ name: 'keep_ratio', kind: 'float', type: 'DOUBLE', width: 116 }
]

export function UpsellGate({ isAuthenticated, isTrial, topRight }: UpsellGateProps) {
	const router = useRouter()
	const subscriptionHref = `/subscription?returnUrl=${encodeURIComponent(router.asPath)}`

	const heading = 'Unlock SQL Studio'

	const copy = isTrial
		? 'Your trial includes preview-only CSV downloads. Upgrade to the API plan to run SQL queries across every DefiLlama dataset in your browser.'
		: isAuthenticated
			? 'SQL Studio is part of the DefiLlama API plan. Run cross-dataset joins, charts, and notebooks across every dataset DefiLlama tracks — plus full programmatic API access.'
			: 'SQL Studio is part of the DefiLlama API plan. Sign in and subscribe to run cross-dataset joins, charts, and notebooks across every DefiLlama dataset.'

	return (
		<div className="flex flex-col gap-14 pb-8">
			<section className="flex flex-col gap-8 lg:gap-10">
				<header className="flex flex-col gap-5">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-(--sub-brand-primary)" />
							<span className="font-mono text-[11px] font-semibold tracking-[0.18em] text-(--sub-brand-primary) uppercase">
								API plan
							</span>
						</div>
						{topRight ? <div className="shrink-0">{topRight}</div> : null}
					</div>
					<h2 className="text-4xl leading-[1.04] font-semibold tracking-tight text-balance text-(--text-primary) lg:text-5xl">
						{heading}
					</h2>
					<p className="max-w-xl text-base leading-relaxed text-(--text-secondary)">{copy}</p>
				</header>

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
					<SamplePane />
					<PricingCard isAuthenticated={isAuthenticated} subscriptionHref={subscriptionHref} />
				</div>
			</section>

			<section className="flex flex-col gap-6">
				<div className="flex items-baseline justify-between gap-3">
					<h3 className="font-mono text-[11px] font-semibold tracking-[0.18em] text-(--text-tertiary) uppercase">
						Everything in SQL Studio
					</h3>
					<span className="hidden text-xs text-(--text-tertiary) sm:inline">
						SQL compute runs locally — your API quota stays untouched
					</span>
				</div>
				<div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
					{FEATURES.map((f, i) => (
						<FeatureTile key={f.title} index={i + 1} icon={f.icon} title={f.title} body={f.body} />
					))}
				</div>
			</section>
		</div>
	)
}

function PricingCard({
	isAuthenticated,
	subscriptionHref
}: {
	isAuthenticated: boolean
	subscriptionHref: string
}) {
	return (
		<div className="flex flex-col gap-6 rounded-xl border border-(--sub-brand-primary)/30 bg-(--cards-bg) p-6 shadow-sm lg:sticky lg:top-4">
			<div className="flex items-center gap-2">
				<span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-(--sub-brand-primary)" />
				<span className="font-mono text-[11px] font-semibold tracking-[0.18em] text-(--sub-brand-primary) uppercase">
					API plan
				</span>
			</div>

			<div className="flex flex-col gap-1.5">
				<div className="flex items-baseline gap-1.5">
					<span className="text-[3.25rem] leading-none font-semibold tracking-[-0.04em] tabular-nums text-(--text-primary)">
						$300
					</span>
					<span className="text-base font-medium text-(--text-secondary)">/mo</span>
				</div>
				<span className="text-[12px] text-(--text-tertiary)">
					or <span className="font-mono tabular-nums text-(--text-secondary)">$3,000</span> billed yearly
				</span>
			</div>

			<div className="flex flex-col gap-3 border-t border-(--divider) pt-5">
				<span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-(--text-tertiary) uppercase">
					What's included
				</span>
				<ul className="flex flex-col gap-2.5">
					{PLAN_INCLUDES.map((item) => (
						<li key={item} className="flex items-start gap-2.5 text-[13px] leading-relaxed">
							<Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--sub-brand-primary)" />
							<span className="text-(--text-primary)">{item}</span>
						</li>
					))}
				</ul>
			</div>

			<div className="flex flex-col gap-2">
				<Link
					href={subscriptionHref}
					className="group inline-flex items-center justify-center gap-2 rounded-md bg-(--sub-brand-primary) px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-(--sub-brand-primary)/90 hover:shadow-[0_4px_24px_-8px_rgba(31,103,210,0.5)]"
				>
					{isAuthenticated ? 'Upgrade to API plan' : 'Sign in & subscribe'}
					<Icon
						name="arrow-up-right"
						className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
					/>
				</Link>
				<span className="text-[11px] text-(--text-tertiary)">Cancel anytime · pay with card or crypto</span>
			</div>
		</div>
	)
}

function FeatureTile({
	index,
	icon,
	title,
	body
}: {
	index: number
	icon: IIcon['name']
	title: string
	body: string
}) {
	return (
		<div className="group flex gap-4 border-t border-(--divider) py-5 transition-colors hover:border-(--sub-brand-primary)/40">
			<span className="font-mono text-[11px] font-semibold tabular-nums text-(--text-tertiary)/70">
				{String(index).padStart(2, '0')}
			</span>
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center gap-2">
					<Icon name={icon} className="h-3.5 w-3.5 text-(--sub-brand-primary)" />
					<span className="text-sm font-semibold text-(--text-primary)">{title}</span>
				</div>
				<p className="text-[13px] leading-relaxed text-(--text-secondary)">{body}</p>
			</div>
		</div>
	)
}

function SamplePane() {
	return (
		<div className="flex flex-col overflow-hidden rounded-xl border border-(--divider) bg-(--cards-bg) shadow-sm">
			<div className="flex items-center justify-between gap-3 border-b border-(--divider) bg-(--app-bg)/30 px-4 py-2">
				<div className="flex items-center gap-2 truncate">
					<Icon name="file-text" className="h-3.5 w-3.5 shrink-0 text-(--sub-brand-primary)" />
					<span className="truncate font-mono text-xs font-medium text-(--text-secondary)">
						revenue-capture.sql
					</span>
				</div>
				<span className="flex shrink-0 items-center gap-2 text-[11px]">
					<span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-pro-green-300" />
					<span className="font-mono tracking-[0.12em] text-pro-green-300 uppercase">ready</span>
					<span aria-hidden className="text-(--text-tertiary)/40">·</span>
					<span className="font-mono tabular-nums text-(--text-tertiary)">412ms</span>
					<span aria-hidden className="hidden text-(--text-tertiary)/40 sm:inline">·</span>
					<span className="hidden sm:inline-flex">
						<Keycap>⌘↵</Keycap>
					</span>
				</span>
			</div>

			<div className="border-b border-(--divider) bg-(--app-bg)/40 px-4 py-3">
				<pre className="thin-scrollbar overflow-x-auto font-mono text-[11.5px] leading-[1.55] text-(--text-primary)">
					<code>
						<COMMENT>-- Which protocols earn the most fees, and how much do they capture as revenue?</COMMENT>
						{'\n'}
						<KW>SELECT</KW> f.name, f.category,
						{'\n'}
						{'       '}f.total30d <KW>AS</KW> fees_30d,
						{'\n'}
						{'       '}
						<KW>COALESCE</KW>(r.total30d, <NUM>0</NUM>) <KW>AS</KW> revenue_30d,
						{'\n'}
						{'       '}
						<KW>COALESCE</KW>(r.total30d, <NUM>0</NUM>) / <KW>NULLIF</KW>(f.total30d, <NUM>0</NUM>) <KW>AS</KW> keep_ratio
						{'\n'}
						<KW>FROM</KW> fees f
						{'\n'}
						<KW>LEFT JOIN</KW> revenue r <KW>ON</KW> r.name = f.name
						{'\n'}
						<KW>WHERE</KW> f.total30d &gt; <NUM>100000</NUM>
						{'\n'}
						{'  '}
						<KW>AND</KW> <KW>COALESCE</KW>(r.total30d, <NUM>0</NUM>) / <KW>NULLIF</KW>(f.total30d, <NUM>0</NUM>) &lt;{' '}
						<NUM>0.05</NUM>
						{'\n'}
						<KW>ORDER BY</KW> f.total30d <KW>DESC</KW> <KW>LIMIT</KW> <NUM>30</NUM>;
					</code>
				</pre>
			</div>

			<div className="border-b border-(--divider)">
				<ResultsTable />
			</div>

			<div className="flex flex-col gap-3 px-4 py-3.5">
				<div className="flex items-baseline justify-between">
					<span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-(--text-tertiary) uppercase">
						30d fees by protocol
					</span>
					<span className="font-mono text-[10px] tabular-nums text-(--text-tertiary)">bar · top 7</span>
				</div>
				<FeesChart />
			</div>
		</div>
	)
}

function ResultsTable() {
	const gridTemplate = SAMPLE_COLS.map((c) => `${c.width}px`).join(' ')
	const totalWidth = SAMPLE_COLS.reduce((sum, c) => sum + c.width, 0)
	return (
		<div className="thin-scrollbar overflow-x-auto">
			<div style={{ width: totalWidth, minWidth: '100%' }}>
				<div
					className="grid border-b border-(--divider) bg-(--cards-bg) font-mono text-[11px] text-(--text-secondary)"
					style={{ gridTemplateColumns: gridTemplate, height: 42 }}
				>
					{SAMPLE_COLS.map((col) => {
						const isNumeric = col.kind === 'float' || col.kind === 'int'
						return (
							<div
								key={col.name}
								className={`flex flex-col justify-center gap-0.5 truncate border-l border-(--divider)/60 px-2.5 first:border-l-0 ${
									isNumeric ? 'items-end text-right' : 'items-start text-left'
								}`}
							>
								<div className="flex items-center gap-1.5">
									<TypeBadge kind={col.kind} />
									<span className="truncate font-mono font-semibold text-(--text-primary)">{col.name}</span>
								</div>
								<span className="truncate font-mono text-[10px] font-normal tracking-tight text-(--text-tertiary)/80">
									{col.type}
								</span>
							</div>
						)
					})}
				</div>
				{SAMPLE_ROWS.map((row, i) => {
					const zebra = i % 2 === 1
					return (
						<div
							key={row.name}
							className={`grid font-mono text-[11.5px] tabular-nums transition-colors hover:bg-(--primary)/5 ${
								zebra ? 'bg-(--app-bg)/25' : ''
							}`}
							style={{ gridTemplateColumns: gridTemplate, height: 28 }}
						>
							{SAMPLE_COLS.map((col) => {
								const value = row[col.name]
								const isNumeric = col.kind === 'float' || col.kind === 'int'
								return (
									<div
										key={col.name}
										className={`flex items-center truncate border-l border-(--divider)/30 px-2.5 first:border-l-0 ${
											isNumeric ? 'justify-end' : ''
										} text-(--text-primary)`}
									>
										<span className="truncate">{formatCellValue(value)}</span>
									</div>
								)
							})}
						</div>
					)
				})}
			</div>
		</div>
	)
}

function FeesChart() {
	const data = SAMPLE_ROWS.map((r, i) => ({
		label: r.short,
		value: r.fees_30d,
		tone: BAR_TONES[i] ?? 'bg-(--sub-brand-softest)'
	}))
	const dataMax = Math.max(...data.map((d) => d.value))
	const yMax = niceCeiling(dataMax)
	const ticks = Array.from({ length: 6 }, (_, i) => (yMax * i) / 5)
	const CHART_HEIGHT = 132
	const Y_AXIS_WIDTH = 38

	return (
		<div className="flex w-full" style={{ paddingBottom: 22 }}>
			<div
				className="flex shrink-0 flex-col-reverse justify-between font-mono text-[9.5px] tabular-nums text-(--text-tertiary)"
				style={{ width: Y_AXIS_WIDTH, height: CHART_HEIGHT }}
			>
				{ticks.map((t) => (
					<span key={t} className="pr-1.5 text-right">
						{formatTick(t)}
					</span>
				))}
			</div>

			<div className="relative flex-1">
				<div className="pointer-events-none absolute inset-0 flex flex-col-reverse justify-between">
					{ticks.map((t, i) => (
						<div
							key={t}
							className={`border-t ${i === 0 ? 'border-(--divider)' : 'border-dashed border-(--divider)/40'}`}
						/>
					))}
				</div>

				<div className="relative flex items-end gap-2 px-1" style={{ height: CHART_HEIGHT }}>
					{data.map((b) => {
						const h = (b.value / yMax) * CHART_HEIGHT
						return (
							<div key={b.label} className="group relative flex flex-1 flex-col items-center justify-end">
								<span className="mb-1 font-mono text-[10px] tabular-nums text-(--text-secondary)">
									{formatCompactUsd(b.value)}
								</span>
								<div
									className={`w-full rounded-t-[3px] ${b.tone} transition-opacity group-hover:opacity-90`}
									style={{ height: Math.max(h, 1.5) }}
								/>
								<span
									className="absolute truncate font-mono text-[10px] font-medium text-(--text-tertiary)"
									style={{ top: '100%', marginTop: 6, maxWidth: '100%' }}
								>
									{b.label}
								</span>
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}

const BAR_TONES = [
	'bg-(--sub-brand-primary)',
	'bg-(--sub-brand-secondary)',
	'bg-(--sub-brand-soft)',
	'bg-(--sub-brand-soft)',
	'bg-(--sub-brand-softest)',
	'bg-(--sub-brand-softest)',
	'bg-(--sub-brand-softest)'
]

function KW({ children }: { children: ReactNode }) {
	return <span className="font-semibold text-(--sub-brand-primary)">{children}</span>
}

function NUM({ children }: { children: ReactNode }) {
	return <span className="text-pro-green-300">{children}</span>
}

function COMMENT({ children }: { children: ReactNode }) {
	return <span className="text-(--text-tertiary) italic">{children}</span>
}

function formatCellValue(value: string | number): string {
	if (typeof value === 'string') return value
	if (Number.isInteger(value)) return value.toLocaleString()
	return value.toLocaleString(undefined, { maximumFractionDigits: 6 })
}

function formatCompactUsd(n: number): string {
	if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
	if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`
	return `$${n.toLocaleString()}`
}

function formatTick(t: number): string {
	if (t === 0) return '0'
	if (t >= 1_000_000) return `${(t / 1_000_000).toFixed(0)}M`
	if (t >= 1_000) return `${(t / 1_000).toFixed(0)}k`
	return t.toFixed(0)
}

function niceCeiling(value: number): number {
	if (value <= 0) return 1
	const exponent = Math.floor(Math.log10(value))
	const fraction = value / Math.pow(10, exponent)
	let niceFraction: number
	if (fraction <= 1) niceFraction = 1
	else if (fraction <= 2) niceFraction = 2
	else if (fraction <= 2.5) niceFraction = 2.5
	else if (fraction <= 5) niceFraction = 5
	else niceFraction = 10
	return niceFraction * Math.pow(10, exponent)
}
