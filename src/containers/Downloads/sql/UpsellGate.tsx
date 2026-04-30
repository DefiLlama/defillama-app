import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, type ReactNode } from 'react'
import { Icon, type IIcon } from '~/components/Icon'
import { setSignupSource } from '~/containers/Subscription/signupSource'
import { Keycap, TypeBadge, type ColumnKind } from './primitives'

interface UpsellGateProps {
	isAuthenticated: boolean
	isTrial: boolean
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

interface AltRow {
	chain: string
	tvl: number
	change_30d: number
	dominance: number
}

const ALT_ROWS: AltRow[] = [
	{ chain: 'Ethereum', tvl: 92_510_000_000, change_30d: 0.043, dominance: 0.611 },
	{ chain: 'Solana', tvl: 18_240_000_000, change_30d: 0.082, dominance: 0.121 },
	{ chain: 'BSC', tvl: 9_840_000_000, change_30d: -0.012, dominance: 0.065 },
	{ chain: 'Arbitrum', tvl: 8_120_000_000, change_30d: 0.018, dominance: 0.054 },
	{ chain: 'Tron', tvl: 7_460_000_000, change_30d: 0.004, dominance: 0.049 }
]

interface TableCol<T> {
	name: string
	kind: ColumnKind
	type: string
	width: number
	get: (row: T) => string | number
}

const SAMPLE_COLS: TableCol<SampleRow>[] = [
	{ name: 'name', kind: 'text', type: 'VARCHAR', width: 192, get: (r) => r.name },
	{ name: 'category', kind: 'text', type: 'VARCHAR', width: 188, get: (r) => r.category },
	{ name: 'fees_30d', kind: 'float', type: 'BIGINT', width: 132, get: (r) => r.fees_30d },
	{ name: 'revenue_30d', kind: 'float', type: 'BIGINT', width: 132, get: (r) => r.revenue_30d },
	{ name: 'keep_ratio', kind: 'float', type: 'DOUBLE', width: 116, get: (r) => r.keep_ratio }
]

const ALT_COLS: TableCol<AltRow>[] = [
	{ name: 'chain', kind: 'text', type: 'VARCHAR', width: 152, get: (r) => r.chain },
	{ name: 'tvl', kind: 'float', type: 'BIGINT', width: 152, get: (r) => r.tvl },
	{ name: 'change_30d', kind: 'float', type: 'DOUBLE', width: 142, get: (r) => r.change_30d },
	{ name: 'dominance', kind: 'float', type: 'DOUBLE', width: 124, get: (r) => r.dominance }
]

type TabKey = 'notebook' | 'sql' | 'alt'

interface TabDef {
	key: TabKey
	label: string
	kind: 'notebook' | 'sql'
	dirty?: boolean
}

const TABS: TabDef[] = [
	{ key: 'notebook', label: 'revenue-capture.nb', kind: 'notebook' },
	{ key: 'sql', label: 'fees-vs-revenue.sql', kind: 'sql' },
	{ key: 'alt', label: 'chains-tvl.sql', kind: 'sql', dirty: true }
]

export function UpsellGate({ isAuthenticated, isTrial }: UpsellGateProps) {
	const router = useRouter()
	const subscriptionHref = `/subscription?returnUrl=${encodeURIComponent(router.asPath)}`
	const [activeTab, setActiveTab] = useState<TabKey>('notebook')

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
					<div className="flex items-center gap-2">
						<span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-(--sub-brand-primary)" />
						<span className="font-mono text-[11px] font-semibold tracking-[0.18em] text-(--sub-brand-primary) uppercase">
							API plan
						</span>
					</div>
					<h2 className="text-4xl leading-[1.04] font-semibold tracking-tight text-balance text-(--text-primary) lg:text-5xl">
						{heading}
					</h2>
					<p className="max-w-xl text-base leading-relaxed text-(--text-secondary)">{copy}</p>
				</header>

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
					<ShowcasePane activeTab={activeTab} onTabChange={setActiveTab} />
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

function PricingCard({ isAuthenticated, subscriptionHref }: { isAuthenticated: boolean; subscriptionHref: string }) {
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
					<span className="text-[3.25rem] leading-none font-semibold tracking-[-0.04em] text-(--text-primary) tabular-nums">
						$300
					</span>
					<span className="text-base font-medium text-(--text-secondary)">/mo</span>
				</div>
				<span className="text-[12px] text-(--text-tertiary)">
					or <span className="font-mono text-(--text-secondary) tabular-nums">$3,000</span> billed yearly
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
					onClick={() => setSignupSource('sql-studio')}
					className="group inline-flex items-center justify-center gap-2 rounded-md bg-(--sub-brand-primary) px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-(--sub-brand-primary)/90 hover:shadow-[0_4px_24px_-8px_rgba(31,103,210,0.5)]"
				>
					{isAuthenticated ? 'Upgrade to API plan' : 'Sign in & subscribe'}
					<Icon
						name="arrow-up-right"
						className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
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
			<span className="font-mono text-[11px] font-semibold text-(--text-tertiary)/70 tabular-nums">
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

function ShowcasePane({ activeTab, onTabChange }: { activeTab: TabKey; onTabChange: (next: TabKey) => void }) {
	return (
		<div className="flex flex-col overflow-hidden rounded-xl border border-(--divider) bg-(--cards-bg) shadow-sm">
			<TabStrip activeTab={activeTab} onTabChange={onTabChange} />
			{activeTab === 'notebook' ? <NotebookBody /> : null}
			{activeTab === 'sql' ? <QueryBody /> : null}
			{activeTab === 'alt' ? <AltQueryBody /> : null}
		</div>
	)
}

function TabStrip({ activeTab, onTabChange }: { activeTab: TabKey; onTabChange: (next: TabKey) => void }) {
	return (
		<div
			role="tablist"
			aria-label="SQL Studio sample tabs"
			className="flex thin-scrollbar items-stretch gap-1 overflow-x-auto border-b border-(--divider) bg-(--app-bg)/40 px-2 pt-2"
		>
			{TABS.map((t) => {
				const isActive = activeTab === t.key
				return (
					<button
						key={t.key}
						type="button"
						role="tab"
						aria-selected={isActive}
						onClick={() => onTabChange(t.key)}
						className={`group -mb-px flex h-8 max-w-[220px] min-w-[148px] shrink-0 items-center gap-2 rounded-t-md border border-b-0 px-2.5 transition-colors ${
							isActive
								? 'border-(--divider) bg-(--cards-bg) text-(--text-primary)'
								: 'border-transparent text-(--text-secondary) hover:bg-(--link-hover-bg)/40 hover:text-(--text-primary)'
						}`}
					>
						<span className="flex h-3 w-3 shrink-0 items-center justify-center" aria-hidden>
							{t.dirty ? <span className="h-1.5 w-1.5 rounded-full bg-pro-gold-300" /> : null}
						</span>
						<Icon
							name={t.kind === 'notebook' ? 'layers' : 'file-text'}
							className={`h-3 w-3 shrink-0 ${
								isActive
									? t.kind === 'notebook'
										? 'text-(--sub-brand-primary)'
										: 'text-(--text-secondary)'
									: 'text-(--text-tertiary)'
							}`}
						/>
						<span className="min-w-0 flex-1 truncate text-left font-mono text-[12px]">{t.label}</span>
						<span
							aria-hidden
							className={`grid h-4 w-4 shrink-0 place-items-center rounded-sm transition-opacity ${
								isActive
									? 'opacity-50 hover:bg-(--link-hover-bg)/60 hover:opacity-100'
									: 'opacity-0 group-hover:opacity-50'
							}`}
						>
							<Icon name="x" className="h-2.5 w-2.5" />
						</span>
					</button>
				)
			})}
			<button
				type="button"
				title="New tab (⌘T)"
				onClick={(e) => e.preventDefault()}
				className="-mb-px ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center self-center rounded-md text-(--text-tertiary) transition-colors hover:bg-(--link-hover-bg)/40 hover:text-(--text-secondary)"
			>
				<Icon name="plus" className="h-3.5 w-3.5" />
			</button>
		</div>
	)
}

function NotebookBody() {
	return (
		<div className="flex flex-col">
			<NotebookHeader />
			<div className="flex flex-col gap-2 px-3 py-3">
				<MarkdownCell />
				<SqlNotebookCell />
				<ChartNotebookCell />
				<AddCellBar />
			</div>
		</div>
	)
}

function NotebookHeader() {
	return (
		<div className="flex items-center justify-between gap-3 border-b border-(--divider) bg-(--app-bg)/30 px-4 py-2.5">
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="truncate text-[13px] font-semibold tracking-tight text-(--text-primary)">
					Revenue capture across DeFi
				</span>
				<span className="font-mono text-[10.5px] text-(--text-tertiary) tabular-nums">
					3 cells · 2 SQL · 1 chart · last run 412ms
				</span>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				<span className="hidden items-center gap-1.5 sm:inline-flex">
					<Keycap>⌘</Keycap>
					<Keycap>↵</Keycap>
				</span>
				<button
					type="button"
					onClick={(e) => e.preventDefault()}
					className="inline-flex items-center gap-1.5 rounded-md bg-(--sub-brand-primary) px-3 py-1 text-[11.5px] font-semibold text-white transition-colors hover:bg-(--sub-brand-primary)/90"
				>
					<PlayGlyph />
					Run all
				</button>
			</div>
		</div>
	)
}

function PlayGlyph({ size = 5 }: { size?: number }) {
	const half = size / 2
	return (
		<span
			aria-hidden
			className="block shrink-0"
			style={{
				width: 0,
				height: 0,
				borderTop: `${half}px solid transparent`,
				borderBottom: `${half}px solid transparent`,
				borderLeft: `${size}px solid currentColor`
			}}
		/>
	)
}

function MarkdownCell() {
	return (
		<CellShell focused={false}>
			<CellHeader name="cell_1" badge="md" />
			<div className="px-3 pb-3 pl-9">
				<h4 className="text-[15px] leading-snug font-semibold tracking-tight text-(--text-primary)">
					Revenue capture across DeFi
				</h4>
				<p className="mt-1.5 text-[12.5px] leading-relaxed text-(--text-secondary)">
					Which protocols earn the most fees, and how much do they keep as revenue? Joining{' '}
					<InlineCode>fees</InlineCode> and <InlineCode>revenue</InlineCode> highlights the high-volume, low-capture
					protocols.
				</p>
			</div>
		</CellShell>
	)
}

function InlineCode({ children }: { children: ReactNode }) {
	return (
		<code className="rounded-sm bg-(--app-bg)/70 px-1 py-px font-mono text-[11.5px] text-(--text-primary)">
			{children}
		</code>
	)
}

function SqlNotebookCell() {
	return (
		<CellShell focused>
			<CellHeader
				name="cell_2"
				badge="sql"
				action={
					<>
						<button
							type="button"
							onClick={(e) => e.preventDefault()}
							className="inline-flex items-center gap-1 rounded-md bg-(--sub-brand-primary) px-2 py-0.5 text-[10.5px] font-semibold text-white"
						>
							<PlayGlyph size={4} />
							Run
						</button>
						<span className="hidden items-center gap-1 sm:inline-flex">
							<Keycap muted>⌘</Keycap>
							<Keycap muted>↵</Keycap>
						</span>
						<Icon name="ellipsis" className="h-3.5 w-3.5 text-(--text-tertiary)" />
					</>
				}
			/>
			<div className="px-3 pb-3 pl-9">
				<pre className="thin-scrollbar overflow-x-auto rounded-md border border-(--divider) bg-(--app-bg)/60 px-3 py-2 font-mono text-[11px] leading-[1.55] text-(--text-primary)">
					<code>
						<KW>SELECT</KW> f.name, f.category,
						{'\n'}
						{'       '}f.total30d <KW>AS</KW> fees_30d,
						{'\n'}
						{'       '}
						<KW>COALESCE</KW>(r.total30d, <NUM>0</NUM>) <KW>AS</KW> revenue_30d,
						{'\n'}
						{'       '}
						<KW>COALESCE</KW>(r.total30d, <NUM>0</NUM>) / <KW>NULLIF</KW>(f.total30d, <NUM>0</NUM>) <KW>AS</KW>{' '}
						keep_ratio
						{'\n'}
						<KW>FROM</KW> fees f <KW>LEFT JOIN</KW> revenue r <KW>ON</KW> r.name = f.name
						{'\n'}
						<KW>WHERE</KW> f.total30d &gt; <NUM>100000</NUM>
						{'\n'}
						<KW>ORDER BY</KW> f.total30d <KW>DESC</KW> <KW>LIMIT</KW> <NUM>7</NUM>;
					</code>
				</pre>

				<div className="mt-2.5 flex items-center justify-between gap-2 text-[10.5px]">
					<span className="font-mono text-(--text-tertiary) tabular-nums">7 rows · 5 cols · 412ms</span>
					<span className="flex items-center gap-1.5 font-mono text-pro-green-300">
						<span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-pro-green-300" />
						<span className="tracking-[0.12em] uppercase">cached</span>
					</span>
				</div>
				<div className="mt-1.5 overflow-hidden rounded-md border border-(--divider)">
					<GridTable rows={SAMPLE_ROWS.slice(0, 3)} cols={SAMPLE_COLS} />
					<div className="border-t border-(--divider)/60 bg-(--app-bg)/30 px-3 py-1.5 font-mono text-[10px] text-(--text-tertiary)">
						… 4 more rows
					</div>
				</div>
			</div>
		</CellShell>
	)
}

function ChartNotebookCell() {
	return (
		<CellShell focused={false}>
			<CellHeader
				name="cell_3"
				badge="chart"
				action={
					<span className="inline-flex items-center gap-1.5 rounded-md border border-(--divider) bg-(--cards-bg) px-2 py-0.5 font-mono text-[10.5px] text-(--text-secondary)">
						<span className="text-(--text-tertiary)">source</span>
						<span className="text-(--text-primary)">cell_2</span>
						<span aria-hidden className="text-(--text-tertiary)/60">
							·
						</span>
						<span className="tabular-nums">7 × 5</span>
						<Icon name="chevron-down" className="h-3 w-3 text-(--text-tertiary)" />
					</span>
				}
			/>
			<div className="px-3 pb-3 pl-9">
				<div className="rounded-md border border-(--divider) bg-(--app-bg)/30 px-3 pt-3">
					<div className="mb-2 flex items-baseline justify-between">
						<span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-(--text-tertiary) uppercase">
							30d fees by protocol
						</span>
						<span className="font-mono text-[10px] text-(--text-tertiary) tabular-nums">bar · top 7</span>
					</div>
					<FeesChart height={108} />
				</div>
			</div>
		</CellShell>
	)
}

function CellShell({ focused, children }: { focused: boolean; children: ReactNode }) {
	return (
		<div
			className={`relative rounded-md border transition-colors ${
				focused
					? 'border-(--sub-brand-primary)/45 bg-(--cards-bg) shadow-[0_0_0_2px_color-mix(in_oklch,var(--sub-brand-primary)_10%,transparent)]'
					: 'border-(--divider) bg-(--cards-bg)/60 hover:border-(--divider)'
			}`}
		>
			{children}
		</div>
	)
}

function CellHeader({ name, badge, action }: { name: string; badge: 'sql' | 'md' | 'chart'; action?: ReactNode }) {
	return (
		<div className="flex items-center gap-2 px-3 pt-2 pb-1.5">
			<Icon name="menu" className="h-3 w-3 shrink-0 text-(--text-tertiary)/35" />
			<span className="font-mono text-[11px] text-(--text-tertiary)">{name}</span>
			<CellTypeBadge kind={badge} />
			{action ? <div className="ml-auto flex items-center gap-1.5">{action}</div> : null}
		</div>
	)
}

function CellTypeBadge({ kind }: { kind: 'sql' | 'md' | 'chart' }) {
	const map = {
		sql: { label: 'SQL', cls: 'bg-(--sub-brand-primary)/15 text-(--sub-brand-primary)' },
		md: { label: 'MD', cls: 'bg-pro-purple-300/15 text-pro-purple-300' },
		chart: { label: 'CHART', cls: 'bg-pro-gold-300/15 text-pro-gold-300' }
	}[kind]
	return (
		<span
			className={`inline-flex h-[14px] items-center rounded-[3px] px-1 font-mono text-[9px] font-bold tracking-wider uppercase ${map.cls}`}
		>
			{map.label}
		</span>
	)
}

function AddCellBar() {
	return (
		<div className="group flex items-center gap-2 pt-1">
			<span aria-hidden className="h-px flex-1 bg-(--divider)" />
			<span className="inline-flex items-center gap-3 rounded-md text-[11px] text-(--text-tertiary)">
				<AddCellChip dot="bg-(--sub-brand-primary)" label="Query" />
				<AddCellChip dot="bg-pro-gold-300" label="Visualize" />
				<AddCellChip dot="bg-pro-purple-300" label="Narrate" />
			</span>
			<span aria-hidden className="h-px flex-1 bg-(--divider)" />
		</div>
	)
}

function AddCellChip({ dot, label }: { dot: string; label: string }) {
	return (
		<button
			type="button"
			onClick={(e) => e.preventDefault()}
			className="inline-flex items-center gap-1.5 rounded-sm px-1 py-0.5 transition-colors hover:bg-(--link-hover-bg)/40 hover:text-(--text-primary)"
		>
			<span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />
			<span className="font-mono">{label}</span>
		</button>
	)
}

function QueryBody() {
	return (
		<div className="flex flex-col">
			<div className="flex items-center justify-between gap-3 border-b border-(--divider) bg-(--app-bg)/30 px-4 py-2">
				<div className="flex items-center gap-2 truncate">
					<Icon name="file-text" className="h-3.5 w-3.5 shrink-0 text-(--sub-brand-primary)" />
					<span className="truncate font-mono text-xs font-medium text-(--text-secondary)">fees-vs-revenue.sql</span>
				</div>
				<span className="flex shrink-0 items-center gap-2 text-[11px]">
					<span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-pro-green-300" />
					<span className="font-mono tracking-[0.12em] text-pro-green-300 uppercase">ready</span>
					<span aria-hidden className="text-(--text-tertiary)/40">
						·
					</span>
					<span className="font-mono text-(--text-tertiary) tabular-nums">412ms</span>
					<span aria-hidden className="hidden text-(--text-tertiary)/40 sm:inline">
						·
					</span>
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
						<KW>COALESCE</KW>(r.total30d, <NUM>0</NUM>) / <KW>NULLIF</KW>(f.total30d, <NUM>0</NUM>) <KW>AS</KW>{' '}
						keep_ratio
						{'\n'}
						<KW>FROM</KW> fees f{'\n'}
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
				<GridTable rows={SAMPLE_ROWS} cols={SAMPLE_COLS} />
			</div>

			<div className="flex flex-col gap-3 px-4 py-3.5">
				<div className="flex items-baseline justify-between">
					<span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-(--text-tertiary) uppercase">
						30d fees by protocol
					</span>
					<span className="font-mono text-[10px] text-(--text-tertiary) tabular-nums">bar · top 7</span>
				</div>
				<FeesChart />
			</div>
		</div>
	)
}

function AltQueryBody() {
	return (
		<div className="flex flex-col">
			<div className="flex items-center justify-between gap-3 border-b border-(--divider) bg-(--app-bg)/30 px-4 py-2">
				<div className="flex items-center gap-2 truncate">
					<Icon name="file-text" className="h-3.5 w-3.5 shrink-0 text-(--text-tertiary)" />
					<span className="truncate font-mono text-xs font-medium text-(--text-secondary)">chains-tvl.sql</span>
					<span aria-hidden className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-pro-gold-300" />
					<span className="font-mono text-[10px] tracking-[0.12em] text-pro-gold-300 uppercase">unsaved</span>
				</div>
				<span className="flex shrink-0 items-center gap-2 text-[11px]">
					<span className="font-mono text-(--text-tertiary) tabular-nums">86ms</span>
				</span>
			</div>

			<div className="border-b border-(--divider) bg-(--app-bg)/40 px-4 py-3">
				<pre className="thin-scrollbar overflow-x-auto font-mono text-[11.5px] leading-[1.55] text-(--text-primary)">
					<code>
						<COMMENT>-- Top L1 chains by TVL with rolling 30d change and dominance</COMMENT>
						{'\n'}
						<KW>SELECT</KW> name <KW>AS</KW> chain, tvl,
						{'\n'}
						{'       '}rolling_30d_change <KW>AS</KW> change_30d,
						{'\n'}
						{'       '}tvl / <KW>SUM</KW>(tvl) <KW>OVER</KW> () <KW>AS</KW> dominance
						{'\n'}
						<KW>FROM</KW> chains
						{'\n'}
						<KW>WHERE</KW> tvl &gt; <NUM>1000000000</NUM>
						{'\n'}
						<KW>ORDER BY</KW> tvl <KW>DESC</KW> <KW>LIMIT</KW> <NUM>5</NUM>;
					</code>
				</pre>
			</div>

			<GridTable rows={ALT_ROWS} cols={ALT_COLS} />
		</div>
	)
}

function GridTable<T>({ rows, cols }: { rows: T[]; cols: TableCol<T>[] }) {
	const gridTemplate = cols.map((c) => `${c.width}px`).join(' ')
	const totalWidth = cols.reduce((sum, c) => sum + c.width, 0)
	return (
		<div className="thin-scrollbar overflow-x-auto">
			<div style={{ width: totalWidth, minWidth: '100%' }}>
				<div
					className="grid border-b border-(--divider) bg-(--cards-bg) font-mono text-[11px] text-(--text-secondary)"
					style={{ gridTemplateColumns: gridTemplate, height: 42 }}
				>
					{cols.map((col) => {
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
				{rows.map((row, i) => {
					const zebra = i % 2 === 1
					return (
						<div
							key={i}
							className={`grid font-mono text-[11.5px] tabular-nums transition-colors hover:bg-(--primary)/5 ${
								zebra ? 'bg-(--app-bg)/25' : ''
							}`}
							style={{ gridTemplateColumns: gridTemplate, height: 28 }}
						>
							{cols.map((col) => {
								const value = col.get(row)
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

function FeesChart({ height = 132 }: { height?: number }) {
	const data = SAMPLE_ROWS.map((r, i) => ({
		label: r.short,
		value: r.fees_30d,
		tone: BAR_TONES[i] ?? 'bg-(--sub-brand-softest)'
	}))
	const dataMax = Math.max(...data.map((d) => d.value))
	const yMax = niceCeiling(dataMax)
	const ticks = Array.from({ length: 6 }, (_, i) => (yMax * i) / 5)
	const Y_AXIS_WIDTH = 38

	return (
		<div className="flex w-full" style={{ paddingBottom: 22 }}>
			<div
				className="flex shrink-0 flex-col-reverse justify-between font-mono text-[9.5px] text-(--text-tertiary) tabular-nums"
				style={{ width: Y_AXIS_WIDTH, height }}
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

				<div className="relative flex items-end gap-2 px-1" style={{ height }}>
					{data.map((b) => {
						const h = (b.value / yMax) * height
						return (
							<div key={b.label} className="group relative flex flex-1 flex-col items-center justify-end">
								<span className="mb-1 font-mono text-[10px] text-(--text-secondary) tabular-nums">
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
