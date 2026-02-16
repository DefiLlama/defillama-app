import * as Ariakit from '@ariakit/react'
import { lazy, Suspense, type ReactNode } from 'react'
import { useAuthContext } from '../Subscribtion/auth'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

const CheckIcon = () => (
	<span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2172E5]/[0.12]">
		<svg
			viewBox="0 0 24 24"
			className="h-3 w-3"
			fill="none"
			stroke="#2172E5"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<polyline points="20 6 9 17 4 12" />
		</svg>
	</span>
)

const highlightFormula = (formula: string) => {
	const parts = formula.split(/(=\w+|"[^"]*"|[(),])/).filter(Boolean)
	return (
		<span>
			{parts.map((part, i) => {
				if (part.startsWith('=')) return <span key={i} className="text-[#2172E5]">{part}</span>
				if (part.startsWith('"')) return <span key={i} className="text-[#4ade80]">{part}</span>
				return <span key={i} className="text-[#8a8c90]">{part}</span>
			})}
		</span>
	)
}

const heroRows = [
	{ num: '1', formula: '=DEFILLAMA("tvl", "ethereum")', value: '$54.5B', selected: true },
	{ num: '2', formula: '=DEFILLAMA("fees-7d", "uniswap")', value: '$14.8M' },
	{ num: '3', formula: '=DEFILLAMA("revenue-30d", "lido")', value: '$5.4M' },
	{ num: '4', formula: '=DEFILLAMA_STABLECOIN_MCAP("USDT")', value: '$183.7B' }
]

const marketMetricsTable = {
	rows: [
		{ num: '1', cells: [{ value: '=DEFILLAMA("tvl", "aave")', variant: 'formula' as const }, { value: '$27.0B', variant: 'value' as const }] },
		{ num: '2', cells: [{ value: '=DEFILLAMA("fees-24h", "gmx")', variant: 'formula' as const }, { value: '$87.9K', variant: 'value' as const }] },
		{ num: '3', cells: [{ value: '=DEFILLAMA("mcap", "sky")', variant: 'formula' as const }, { value: '$1.5B', variant: 'value' as const }] },
		{ num: '4', cells: [{ value: '=DEFILLAMA("volume-7d", "uniswap")', variant: 'formula' as const }, { value: '$13.5B', variant: 'value' as const }] }
	]
}

const yieldsTable = {
	formulaBar: '=DEFILLAMA_YIELD("Ethereum", "USDC", "tvl", 3)',
	headers: { labels: ['Chain', 'Project', 'Symbol', 'APY%', 'TVL'] },
	rows: [
		{
			num: '1',
			cells: [
				{ value: 'Ethereum' },
				{ value: 'Maple' },
				{ value: 'USDC' },
				{ value: '4.58%', variant: 'value' as const },
				{ value: '$3.2B', variant: 'value' as const }
			]
		},
		{
			num: '2',
			cells: [
				{ value: 'Ethereum' },
				{ value: 'Aave V3' },
				{ value: 'USDC' },
				{ value: '2.33%', variant: 'value' as const },
				{ value: '$1.2B', variant: 'value' as const }
			]
		},
		{
			num: '3',
			cells: [
				{ value: 'Ethereum' },
				{ value: 'Merkl' },
				{ value: 'USDC' },
				{ value: '0.35%', variant: 'value' as const },
				{ value: '$1.1B', variant: 'value' as const }
			]
		}
	]
}

const stablecoinsTable = {
	rows: [
		{ num: '1', cells: [{ value: '=DEFILLAMA_STABLECOIN_MCAP("USDT", "Tron")', variant: 'formula' as const }, { value: '$83.8B', variant: 'value' as const }] },
		{ num: '2', cells: [{ value: '=DEFILLAMA_STABLECOIN_MCAP("USDC")', variant: 'formula' as const }, { value: '$73.7B', variant: 'value' as const }] },
		{ num: '3', cells: [{ value: '=DEFILLAMA_STABLECOIN_MCAP("DAI")', variant: 'formula' as const }, { value: '$4.4B', variant: 'value' as const }] },
		{ num: '4', cells: [{ value: '=DEFILLAMA_STABLECOIN_MCAP("all", "Ethereum")', variant: 'formula' as const }, { value: '$159.4B', variant: 'value' as const }] }
	]
}

const historicalTable = {
	formulaBar: '=DEFILLAMA_HISTORICAL("tvl", "ethereum", "2025-01-01", "2025-01-05")',
	headers: { num: '1', labels: ['Date', 'TVL'] },
	rows: [
		{ num: '2', cells: [{ value: '2025-01-01' }, { value: '$65.3B', variant: 'value' as const }] },
		{ num: '3', cells: [{ value: '2025-01-02' }, { value: '$66.2B', variant: 'value' as const }] },
		{ num: '4', cells: [{ value: '2025-01-03' }, { value: '$67.6B', variant: 'value' as const }] },
		{ num: '5', cells: [{ value: '2025-01-04' }, { value: '$70.2B', variant: 'value' as const }] },
		{ num: '6', cells: [{ value: '2025-01-05' }, { value: '$71.1B', variant: 'value' as const }] }
	]
}

const templates = [
	{
		title: 'Stablecoin Yield Finder',
		desc: 'Find the best stablecoin yields across lending protocols and chains.',
		href: 'https://docs.llama.fi/spreadsheet-functions/templates#stablecoin-yield-finder',
		icon: (
			<svg viewBox="0 0 24 24">
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
		)
	},
	{
		title: 'Multi-Chain Yield Finder',
		desc: 'Track and compare yield opportunities across multiple chains with earnings calculator.',
		href: 'https://docs.llama.fi/spreadsheet-functions/templates#multi-chain-yield-finder-with-earnings-calculator',
		icon: (
			<svg viewBox="0 0 24 24">
				<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
			</svg>
		)
	},
	{
		title: 'Protocol Comparison',
		desc: 'Side-by-side TVL, fees, revenue, and key metrics for any set of protocols.',
		href: 'https://docs.llama.fi/spreadsheet-functions/templates#protocol-comparison-table',
		icon: (
			<svg viewBox="0 0 24 24">
				<rect x="3" y="3" width="18" height="18" rx="2" />
				<line x1="9" y1="3" x2="9" y2="21" />
				<line x1="3" y1="9" x2="21" y2="9" />
			</svg>
		)
	},
	{
		title: 'Chain Comparison',
		desc: 'Side-by-side metrics for multiple chains including TVL, fees, and users.',
		href: 'https://docs.llama.fi/spreadsheet-functions/templates#chain-comparison-table',
		icon: (
			<svg viewBox="0 0 24 24">
				<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
			</svg>
		)
	},
	{
		title: 'Advanced Revenue Table',
		desc: 'Comprehensive financial metrics for revenue-generating protocols.',
		href: 'https://docs.llama.fi/spreadsheet-functions/templates#advanced-revenue-table',
		icon: (
			<svg viewBox="0 0 24 24">
				<line x1="18" y1="20" x2="18" y2="10" />
				<line x1="12" y1="20" x2="12" y2="4" />
				<line x1="6" y1="20" x2="6" y2="14" />
			</svg>
		)
	}
]

const SectionSeparator = () => <hr className="mx-auto max-w-[1100px] border-[#39393E]/40" />

const HeroMock = () => {
	const heroGridCols = '36px minmax(0, 1fr) minmax(108px, 0.55fr)'

	return (
		<div className="overflow-hidden rounded-2xl border border-[#39393E]/40 bg-[#1a1b1f] shadow-[0_4px_20px_rgba(33,114,229,0.15),0_8px_32px_rgba(0,0,0,0.3)]">
			<div className="flex items-center gap-2.5 border-b border-[#39393E]/40 px-4 py-2 text-xs">
			<span className="min-w-[36px] rounded border border-[#39393E] bg-[#222429] px-2 py-[3px] text-center font-mono text-[11px] text-[#8a8c90]">
				B2
			</span>
			<span className="min-w-0 max-w-full truncate font-mono text-xs">{highlightFormula('=DEFILLAMA("tvl", "ethereum")')}</span>
		</div>
			<div className="grid border-b border-[#39393E]/40 bg-[#222429]/50" style={{ gridTemplateColumns: heroGridCols }}>
			<div className="border-r border-[#39393E]/40 px-3 py-2.5" />
			<div className="flex items-center border-r border-[#39393E]/40 px-3 py-2.5 text-[11px] font-semibold tracking-[0.5px] text-[#8a8c90] uppercase">
				A
			</div>
			<div className="flex items-center px-3 py-2.5 text-[11px] font-semibold tracking-[0.5px] text-[#8a8c90] uppercase">
				B
			</div>
		</div>
		{heroRows.map((row) => (
				<div
					key={row.num}
					className="grid border-b border-[#39393E]/40 last:border-b-0"
					style={{ gridTemplateColumns: heroGridCols }}
				>
				<div className="flex items-center justify-center border-r border-[#39393E]/40 bg-[#222429]/30 px-3 py-2.5 font-mono text-[11px] text-[#8a8c90]">
					{row.num}
				</div>
					<div className="flex min-w-0 items-center overflow-hidden border-r border-[#39393E]/40 px-3 py-2.5 font-mono text-xs">
						<span className="block min-w-0 max-w-full truncate whitespace-nowrap">{highlightFormula(row.formula)}</span>
				</div>
				<div
					className={`flex items-center px-3 py-2.5 font-mono text-xs font-semibold text-[#4ade80] ${row.selected ? 'rounded-sm ring-2 ring-[#2172E5] ring-inset' : ''}`}
				>
					{row.value}
				</div>
			</div>
		))}
		</div>
	)
}

const ShowcaseSection = ({
	overline,
	heading,
	description,
	bullets,
	reversed,
	children
}: {
	overline: string
	heading: string
	description: string
	bullets: string[]
	reversed?: boolean
	children: ReactNode
}) => (
	<section className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6 md:px-8 md:py-20">
		<div
			className={`grid grid-cols-1 items-center gap-8 md:gap-[60px] ${reversed ? 'md:grid-cols-[45fr_55fr]' : 'md:grid-cols-[55fr_45fr]'}`}
		>
			<div className={reversed ? 'md:order-2' : ''}>
				<div className="mb-3 text-[13px] font-semibold tracking-[2px] text-[#2172E5] uppercase">{overline}</div>
				<h2 className="mb-3.5 text-[28px] leading-[1.25] font-bold tracking-[-0.02em]">{heading}</h2>
				<p className="mb-6 text-[15px] leading-relaxed text-[#b4b7bc]">{description}</p>
				<ul className="flex flex-col gap-3">
					{bullets.map((bullet) => (
						<li key={bullet} className="flex items-start gap-2.5 text-sm leading-normal text-[#b4b7bc]">
							<CheckIcon />
							{bullet}
						</li>
					))}
				</ul>
			</div>
			<div className={reversed ? 'md:order-1' : ''}>{children}</div>
		</div>
	</section>
)

type MockCell = { value: string; variant?: 'value' | 'formula'; colSpan?: number }
type MockRow = { num: string; cells: MockCell[] }

const cellClass = (variant?: 'value' | 'formula') =>
	variant === 'value' ? 'font-semibold text-[#4ade80]' : variant === 'formula' ? '' : 'text-[#b4b7bc]'

const MockTable = ({
	formulaBar,
	headers,
	rows,
	footer
}: {
	formulaBar?: string
	headers?: { num?: string; labels: string[] }
	rows: MockRow[]
	footer?: MockRow
}) => {
	const colCount = headers ? headers.labels.length : rows[0].cells.length
	const valueColTrack = colCount <= 2 ? '96px' : 'minmax(92px, 0.8fr)'
	const gridCols =
		colCount === 1
			? '28px minmax(0, 1fr)'
			: `28px repeat(${colCount - 1}, minmax(0, 1fr)) ${valueColTrack}`
	const hasRightSeparator = (cells: MockCell[], index: number) => {
		let occupiedColumns = 0
		for (let i = 0; i <= index; i++) {
			occupiedColumns += cells[i].colSpan ?? 1
		}
		return occupiedColumns < colCount
	}

	return (
		<div className="overflow-hidden rounded-xl border border-[#39393E]/40 bg-[#1a1b1f] shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
			{formulaBar && (
				<div className="grid grid-cols-[28px_1fr] border-b border-[#39393E]/40">
					<div className="border-r border-[#39393E]/40 bg-[#222429]/30 px-2.5 py-2" />
					<div className="flex items-center px-2.5 py-2 font-mono text-[11px]">{highlightFormula(formulaBar)}</div>
				</div>
			)}
			{headers && (
				<div className="border-b border-[#39393E]/40 bg-[#222429]/40" style={{ display: 'grid', gridTemplateColumns: gridCols }}>
					<div className="flex items-center justify-center border-r border-[#39393E]/40 bg-[#222429]/30 px-2.5 py-[7px] font-mono text-[10px] text-[#8a8c90]">
						{headers.num}
					</div>
					{headers.labels.map((label, i) => (
						<div
							key={label}
							className={`flex items-center px-2.5 py-[7px] text-[10px] font-semibold tracking-[0.3px] text-[#8a8c90] uppercase ${i < colCount - 1 ? 'border-r border-[#39393E]/40' : ''}`}
						>
							{label}
						</div>
					))}
				</div>
			)}
			{rows.map((row) => (
				<div
					key={row.num}
					className="border-b border-[#39393E]/40 last:border-b-0"
					style={{ display: 'grid', gridTemplateColumns: gridCols }}
				>
					<div className="flex items-center justify-center border-r border-[#39393E]/40 bg-[#222429]/30 px-2.5 py-[7px] font-mono text-[10px] text-[#8a8c90]">
						{row.num}
					</div>
					{row.cells.map((cell, i) => (
						<div
							key={i}
							className={`flex min-w-0 items-center overflow-hidden px-2.5 py-[7px] font-mono text-[11px] whitespace-nowrap ${cellClass(cell.variant)} ${hasRightSeparator(row.cells, i) ? 'border-r border-[#39393E]/40' : ''}`}
							style={cell.colSpan ? { gridColumn: `span ${cell.colSpan}` } : undefined}
						>
							{cell.variant === 'formula' ? highlightFormula(cell.value) : cell.value}
						</div>
					))}
				</div>
			))}
			{footer && (
				<div className="border-t border-[#39393E]/40" style={{ display: 'grid', gridTemplateColumns: gridCols }}>
					<div className="flex items-center justify-center border-r border-[#39393E]/40 bg-[#222429]/30 px-2.5 py-[7px] font-mono text-[10px] text-[#8a8c90]">
						{footer.num}
					</div>
						{footer.cells.map((cell, i) => (
							<div
								key={i}
								className={`flex min-w-0 items-center overflow-hidden px-2.5 py-[7px] font-mono text-[11px] whitespace-nowrap ${cellClass(cell.variant)} ${hasRightSeparator(footer.cells, i) ? 'border-r border-[#39393E]/40' : ''}`}
								style={cell.colSpan ? { gridColumn: `span ${cell.colSpan}` } : undefined}
							>
								{cell.variant === 'formula' ? highlightFormula(cell.value) : cell.value}
							</div>
						))}
				</div>
			)}
		</div>
	)
}

const TemplatesSection = () => (
	<section className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6 md:px-8 md:py-20">
		<div className="mb-12 text-center">
			<h2 className="mb-2.5 text-[32px] font-bold tracking-[-0.02em]">Templates</h2>
			<p className="mx-auto max-w-[500px] text-base text-[#b4b7bc]">
				Pre-built spreadsheets to get you started. Clone and customize to fit your workflow.
			</p>
		</div>
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{templates.map((tpl) => (
				<a
					key={tpl.title}
					href={tpl.href}
					target="_blank"
					rel="noopener noreferrer"
					className="flex flex-col gap-2.5 rounded-2xl border border-[#39393E]/40 bg-[#1a1b1f] p-7 transition-all hover:border-[#2172E5] hover:shadow-[0_4px_20px_rgba(33,114,229,0.15)]"
				>
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2172E5]/10 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:fill-none [&>svg]:stroke-[#2172E5] [&>svg]:[stroke-width:1.8] [&>svg]:[stroke-linecap:round] [&>svg]:[stroke-linejoin:round]">
						{tpl.icon}
					</div>
					<h3 className="text-[15px] font-semibold">{tpl.title}</h3>
					<p className="text-[13px] leading-normal text-[#8a8c90]">{tpl.desc}</p>
					<span className="mt-auto flex items-center gap-1 text-[13px] font-medium text-[#2172E5]">
						View template &rarr;
					</span>
				</a>
			))}
		</div>
	</section>
)

export default function SheetsContainer() {
	const subscribeModalStore = Ariakit.useDialogStore()
	const { isAuthenticated, hasActiveSubscription } = useAuthContext()

	const onGoogleSheetsButtonClick = () => {
		if (!isAuthenticated || !hasActiveSubscription) {
			subscribeModalStore.show()
			return
		}
		window.open('https://workspace.google.com/marketplace/app/defillama_sheets/571407189628', '_blank')
	}

	const onExcelButtonClick = () => {
		if (!isAuthenticated || !hasActiveSubscription) {
			subscribeModalStore.show()
			return
		}
		window.open('https://marketplace.microsoft.com/en-us/product/WA200009711', '_blank')
	}

	return (
		<>
			<section className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-4 pt-12 pb-[60px] sm:px-6 md:grid-cols-2 md:gap-[60px] md:px-8 md:pt-20">
				<div className="flex flex-col gap-5">
					<h2 className="text-[24px] font-bold tracking-[-0.02em] text-[#2172E5]">DefiLlama Sheets</h2>
					<h1 className="text-[clamp(32px,4vw,48px)] leading-[1.15] font-extrabold tracking-[-0.03em]">
						Your spreadsheet, powered by DeFi data
					</h1>
					<p className="max-w-[480px] text-[17px] leading-relaxed text-[#b4b7bc]">
						Custom functions that pull TVL, fees, yields, stablecoin stats and historical data for 6,000+ protocols.
					</p>
					<div className="mt-1 flex flex-col gap-3 sm:flex-row">
						<button
							onClick={onGoogleSheetsButtonClick}
							className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a3a2a] px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:bg-[#224a35] hover:shadow-[0_4px_16px_rgba(52,168,83,0.2)]"
						>
							<img src="/assets/google-sheets.svg" alt="" className="h-[18px] w-[18px]" />
							Google Sheets
						</button>
						<button
							onClick={onExcelButtonClick}
							className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#162e22] px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:bg-[#1e3d2d] hover:shadow-[0_4px_16px_rgba(33,115,70,0.2)]"
						>
							<img src="/assets/microsoft-excel-v2.svg" alt="" className="h-[18px] w-[18px]" />
							Excel Add-in
						</button>
					</div>
				</div>
				<HeroMock />
			</section>

			<SectionSeparator />
			<ShowcaseSection
				overline="Market Metrics"
				heading="Real-time Protocol & Chain Data"
				description="Access TVL, fees, revenue, market cap, price and more for every protocol and chain. Data refreshes hourly."
				bullets={[
					'30+ metrics including fees, revenue, volume, perps',
					'6,000+ protocols and 400+ chains',
					'24h, 7d, and 30d timeframes'
				]}
			>
				<MockTable {...marketMetricsTable} />
			</ShowcaseSection>
			<SectionSeparator />
			<ShowcaseSection
				overline="Yields"
				heading="Yield Intelligence Across Chains"
				description="Discover the best yield opportunities — filter by chain, token, and APY. Get detailed pool data including IL risk and reward tokens."
				bullets={[
					'Filter pools by chain, token, APY, or TVL',
					'Detailed pool data with IL risk and reward tokens',
					'Top pools discovery and comparison'
				]}
				reversed
			>
				<MockTable {...yieldsTable} />
			</ShowcaseSection>
			<SectionSeparator />
			<ShowcaseSection
				overline="Stablecoins"
				heading="Stablecoin Market Intelligence"
				description="Track stablecoin market caps, peg health, and supply across chains. Monitor historical trends and cross-chain distribution."
				bullets={[
					'Market cap by stablecoin and chain',
					'Historical supply data and trends',
					'Full stablecoin directory with peg types'
				]}
			>
				<MockTable {...stablecoinsTable} />
			</ShowcaseSection>
			<SectionSeparator />
			<ShowcaseSection
				overline="Historical Data"
				heading="Historical Snapshots & Time Series"
				description="Pull historical data for any metric and date range. Build charts and trend analysis with hourly-refreshed data."
				bullets={[
					'Single date or full date range queries',
					'Ascending or descending sort',
					'Perfect for building time-series charts'
				]}
				reversed
			>
				<MockTable {...historicalTable} />
			</ShowcaseSection>
			<SectionSeparator />
			<TemplatesSection />

			<Suspense fallback={<></>}>
				<SubscribeProModal dialogStore={subscribeModalStore} />
			</Suspense>
		</>
	)
}
