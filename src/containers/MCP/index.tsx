import * as Ariakit from '@ariakit/react'
import { useState, type ReactNode } from 'react'
import { Icon } from '~/components/Icon'
import { SubscribeAPICard } from '~/components/SubscribeCards/SubscribeAPICard'
import { trackUmamiEvent } from '~/utils/analytics/umami'
import { useAuthContext } from '../Subscribtion/auth'
import { WalletProvider } from '~/layout/WalletProvider'

const toolCategories = [
	{
		label: 'Protocol & Chain',
		tools: [
			{ name: 'resolve_entity', desc: 'Fuzzy-match protocol, chain, or token names to exact slugs' },
			{ name: 'get_protocol_metrics', desc: 'Protocol TVL, fees, revenue, mcap, ratios, trends' },
			{ name: 'get_protocol_info', desc: 'Protocol metadata, URLs, audit info, tags' },
			{ name: 'get_chain_metrics', desc: 'Chain TVL, gas fees, revenue, DEX volume' },
			{ name: 'get_chain_info', desc: 'Chain metadata, type, L2 parent' },
			{ name: 'get_category_metrics', desc: 'Category rankings by TVL, fees, protocol count' },
			{ name: 'list_categories', desc: 'List all valid protocol/token/chain categories' }
		]
	},
	{
		label: 'Tokens & Yield',
		tools: [
			{ name: 'get_token_prices', desc: 'Token price, mcap, volume, ATH, growth rankings' },
			{ name: 'get_token_tvl', desc: 'Token deposits across DeFi protocols' },
			{ name: 'get_token_unlocks', desc: 'Vesting schedules and upcoming unlocks' },
			{ name: 'get_yield_pools', desc: 'Pool APY, TVL, lending/borrowing rates' }
		]
	},
	{
		label: 'Markets & Trading',
		tools: [
			{ name: 'get_market_totals', desc: 'Global DeFi TVL, DEX volume, derivatives volume' },
			{ name: 'get_cex_volumes', desc: 'Centralized exchange trading volume' },
			{ name: 'get_open_interest', desc: 'Derivatives open interest' }
		]
	},
	{
		label: 'Flows & Events',
		tools: [
			{ name: 'get_stablecoin_supply', desc: 'Stablecoin issuance by chain and peg type' },
			{ name: 'get_bridge_flows', desc: 'Bridge volume and net flows by chain' },
			{ name: 'get_etf_flows', desc: 'Bitcoin and Ethereum ETF inflows/outflows' },
			{ name: 'get_events', desc: 'Hacks, fundraises, protocol events' }
		]
	},
	{
		label: 'Deep Dive',
		tools: [
			{ name: 'get_dat_holdings', desc: 'Institutional crypto holdings and mNAV' },
			{ name: 'get_oracle_metrics', desc: 'Oracle TVS and protocol coverage' },
			{ name: 'get_treasury', desc: 'Protocol treasury holdings' },
			{ name: 'get_user_activity', desc: 'Daily active users and transactions' },
			{ name: 'get_income_statement', desc: 'Protocol revenue breakdown' }
		]
	}
]

const clients = [
	{ name: 'Claude', icon: '/assets/mcp-clients/claude.svg' },
	{ name: 'OpenClaw', icon: '/assets/mcp-clients/openclaw.svg' },
	{ name: 'Claude Code', icon: '/assets/mcp-clients/claudecode.svg' },
	{ name: 'Cursor', icon: '/assets/mcp-clients/cursor.svg' },
	{ name: 'Windsurf', icon: '/assets/mcp-clients/windsurf.svg' },
	{ name: 'Codex', icon: '/assets/mcp-clients/codex.svg' },
	{ name: 'Gemini CLI', icon: '/assets/mcp-clients/gemini.svg' },
	{ name: 'OpenCode', icon: '/assets/mcp-clients/opencode.svg' },
	{ name: 'Cline', icon: '/assets/mcp-clients/cline.svg' }
]

function ClientMarquee() {
	const items = [...clients, ...clients]
	return (
		<div
			className="marquee-container relative mt-8"
			style={{
				maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
			}}
		>
			<div className="marquee flex items-center">
				{items.map((c, i) => (
					<div
						key={`${c.name}-${i}`}
						className="flex shrink-0 items-center gap-2.5 opacity-50 transition-opacity hover:opacity-100"
					>
						<img src={c.icon} alt={c.name} width={20} height={20} className="dark:invert" />
						<span className="text-sm font-medium whitespace-nowrap text-(--text-tertiary)">{c.name}</span>
					</div>
				))}
			</div>
		</div>
	)
}

const skills = [
	{ name: 'defi-data', desc: 'Core reference: maps any DeFi question to the right tool' },
	{ name: 'protocol-deep-dive', desc: 'Complete protocol report: TVL, fees, yields, income, users, token' },
	{ name: 'token-research', desc: 'Token analysis: price, unlocks, DeFi deposits, yield opportunities' },
	{ name: 'chain-ecosystem', desc: 'Blockchain overview: TVL, top protocols, bridges, stablecoins' },
	{ name: 'defi-market-overview', desc: 'Full market snapshot: TVL, categories, chains, events' },
	{ name: 'yield-strategies', desc: 'Yield hunting: pool filtering, APY conventions, capacity' },
	{ name: 'risk-assessment', desc: 'Risk evaluation: hacks, oracles, treasury, fundamentals' },
	{ name: 'flows-and-events', desc: 'Capital flows: bridges, ETFs, stablecoins, hacks, raises' },
	{ name: 'market-analysis', desc: 'Screening and comparison: valuation ratios, growth' },
	{ name: 'institutional-crypto', desc: 'Corporate holdings, ETF flows, mNAV ratios' }
]

function TerminalMock() {
	return (
		<div className="overflow-hidden rounded-md border border-(--cards-border) bg-(--bg-card) font-jetbrains text-[13px] leading-relaxed shadow-lg">
			<div className="flex items-center gap-2 border-b border-(--cards-border) px-4 py-2.5">
				<span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
				<span className="h-3 w-3 rounded-full bg-[#febc2e]" />
				<span className="h-3 w-3 rounded-full bg-[#28c840]" />
				<span className="ml-2 text-[11px] text-(--text-tertiary)">claude</span>
			</div>
			<div className="space-y-3 p-4">
				<div>
					<span className="text-(--text-tertiary)">→ </span>
					<span className="text-(--text-secondary)">What are the top 5 protocols by TVL?</span>
				</div>
				<div className="rounded-md border border-(--old-blue)/20 bg-(--old-blue)/5 px-3 py-2">
					<span className="text-(--old-blue)">⚡ get_protocol_metrics</span>
					<span className="text-(--text-tertiary)"> sort_by: &quot;tvl_base desc&quot;, limit: 5</span>
				</div>
				<div className="text-(--success)">
					<div>1. Aave · $25.7B</div>
					<div>2. Lido · $20.0B</div>
					<div>3. SSV Network · $15.5B</div>
					<div>4. EigenCloud · $9.2B</div>
					<div>5. Binance Staked ETH · $8.0B</div>
				</div>
			</div>
		</div>
	)
}

function CopyBox({ text, label }: { text: string; label: string }) {
	return (
		<div className="mx-auto max-w-3xl">
			<div className="overflow-hidden rounded-md border border-(--old-blue)/30 bg-(--bg-card)">
				<div className="flex items-center justify-between border-b border-(--cards-border) px-4 py-2.5">
					<span className="text-xs font-medium text-(--old-blue)">{label}</span>
					<button
						onClick={async (e) => {
							const btn = e.currentTarget
							try {
								await navigator.clipboard.writeText(text)
								trackUmamiEvent('mcp-copy', { label })
								btn.textContent = 'Copied!'
								setTimeout(() => {
									btn.textContent = 'Copy'
								}, 2000)
							} catch {}
						}}
						className="rounded-md px-3 py-1 text-xs font-medium text-(--old-blue) transition-colors hover:bg-(--old-blue)/10"
					>
						Copy
					</button>
				</div>
				<div className="px-4 py-4">
					<p className="font-jetbrains text-sm leading-relaxed text-(--text-primary)">{text}</p>
				</div>
			</div>
		</div>
	)
}

function CodeBlock({ children, label }: { children: string; label: string }) {
	return (
		<div className="overflow-hidden rounded-md border border-(--cards-border) bg-(--bg-card)">
			<div className="flex items-center justify-between border-b border-(--cards-border) px-4 py-2">
				<span className="text-xs font-medium text-(--text-tertiary)">{label}</span>
				<button
					onClick={async () => {
						try {
							await navigator.clipboard.writeText(children)
							trackUmamiEvent('mcp-copy', { label })
						} catch {}
					}}
					className="rounded-md px-2 py-0.5 text-[11px] text-(--text-tertiary) transition-colors hover:bg-(--btn-hover-bg) hover:text-(--text-primary)"
				>
					Copy
				</button>
			</div>
			<pre className="overflow-x-auto p-4 font-jetbrains text-[13px] leading-relaxed text-(--text-secondary)">
				{children}
			</pre>
		</div>
	)
}

const clientConfigs = [
	{
		name: 'Claude Code',
		code: `claude mcp add defillama --transport http https://mcp.defillama.com/mcp`
	},
	{
		name: 'OpenClaw',
		code: `{
  "mcp": {
    "servers": {
      "defillama": {
        "command": "npx",
        "args": ["-y", "mcp-remote", "https://mcp.defillama.com/mcp"]
      }
    }
  }
}`
	},
	{
		name: 'Codex',
		code: `codex mcp add defillama --url https://mcp.defillama.com/mcp`
	},
	{
		name: 'Cursor / Windsurf',
		code: `{
  "mcpServers": {
    "defillama": {
      "url": "https://mcp.defillama.com/mcp"
    }
  }
}`
	},
	{
		name: 'Gemini CLI',
		code: `{
  "mcpServers": {
    "defillama": {
      "httpUrl": "https://mcp.defillama.com/mcp"
    }
  }
}`
	},
	{
		name: 'OpenCode',
		code: `{
  "mcp": {
    "defillama": {
      "type": "remote",
      "url": "https://mcp.defillama.com/mcp"
    }
  }
}`
	}
]

function ManualSetup() {
	const [active, setActive] = useState(0)
	return (
		<div className="mt-10">
			<h3 className="mb-4 text-center text-[13px] font-medium text-(--text-tertiary)">
				Or add manually to your client config
			</h3>
			<div className="mx-auto max-w-2xl overflow-hidden rounded-md border border-(--cards-border) bg-(--bg-card)">
				<div className="flex overflow-x-auto border-b border-(--cards-border) no-scrollbar">
					{clientConfigs.map((c, i) => (
						<button
							key={c.name}
							onClick={() => setActive(i)}
							className={`shrink-0 px-4 py-2.5 text-[13px] font-medium transition-colors ${
								active === i
									? 'border-b-2 border-(--old-blue) text-(--old-blue)'
									: 'text-(--text-tertiary) hover:text-(--text-primary)'
							}`}
						>
							{c.name}
						</button>
					))}
				</div>
				<div className="relative">
					<button
						onClick={async () => {
							try {
								await navigator.clipboard.writeText(clientConfigs[active].code)
								trackUmamiEvent('mcp-copy', { label: clientConfigs[active].name })
							} catch {}
						}}
						className="absolute top-2 right-3 rounded-md px-2 py-0.5 text-[11px] text-(--text-tertiary) transition-colors hover:bg-(--btn-hover-bg) hover:text-(--text-primary)"
					>
						Copy
					</button>
					<pre className="overflow-x-auto p-4 font-jetbrains text-[13px] leading-relaxed text-(--text-secondary)">
						{clientConfigs[active].code}
					</pre>
				</div>
			</div>
		</div>
	)
}

function FeatureCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
	return (
		<div className="rounded-md border border-(--cards-border) bg-(--bg-card) p-5 transition-colors hover:border-(--old-blue)/30">
			<div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-(--old-blue)/10 text-lg">{icon}</div>
			<h3 className="mb-1.5 font-semibold text-(--text-primary)">{title}</h3>
			<p className="text-sm leading-relaxed text-(--text-tertiary)">{children}</p>
		</div>
	)
}

function StepCard({ step, title, children }: { step: number; title: string; children: ReactNode }) {
	return (
		<div className="rounded-md border border-(--cards-border) bg-(--bg-card) p-5">
			<div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-(--old-blue)/10 text-sm font-bold text-(--old-blue)">
				{step}
			</div>
			<h3 className="mb-1.5 font-semibold text-(--text-primary)">{title}</h3>
			<p className="text-[13px] leading-relaxed text-(--text-tertiary)">{children}</p>
		</div>
	)
}

function SectionHeader({ overline, title, description }: { overline: string; title: string; description?: string }) {
	return (
		<div className="mb-8">
			<p className="mb-2 text-xs font-semibold uppercase tracking-widest text-(--old-blue)">{overline}</p>
			<h2 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
			{description && <p className="max-w-2xl text-[15px] text-(--text-tertiary)">{description}</p>}
		</div>
	)
}

function ToolCategoryGroup({
	label,
	tools,
	defaultOpen
}: {
	label: string
	tools: { name: string; desc: string }[]
	defaultOpen?: boolean
}) {
	const [open, setOpen] = useState(defaultOpen ?? true)
	const panelId = `tools-${label
		.toLowerCase()
		.replace(/\s+&\s+/g, '-')
		.replace(/\s+/g, '-')}`
	return (
		<div>
			<button
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				aria-controls={panelId}
				className="mb-2 flex w-full items-center gap-2 text-left text-xs font-semibold uppercase tracking-widest text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
			>
				<svg
					viewBox="0 0 24 24"
					className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<polyline points="9 18 15 12 9 6" />
				</svg>
				{label}
				<span className="text-(--text-disabled) font-normal normal-case tracking-normal">({tools.length})</span>
			</button>
			{open && (
				<div id={panelId} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{tools.map((t) => (
						<div
							key={t.name}
							className="rounded-md border border-(--cards-border) bg-(--bg-card) px-3.5 py-2.5 transition-colors hover:border-(--old-blue)/30"
						>
							<code className="font-jetbrains text-[13px] font-medium text-(--old-blue)">{t.name}</code>
							<p className="mt-0.5 text-xs leading-relaxed text-(--text-tertiary)">{t.desc}</p>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

export default function MCPContainer() {
	const dialog = Ariakit.useDialogStore()
	const { isAuthenticated, hasActiveSubscription } = useAuthContext()

	const handleGetStarted = () => {
		trackUmamiEvent('mcp-get-started', { authenticated: isAuthenticated, subscribed: hasActiveSubscription })
		if (!isAuthenticated || !hasActiveSubscription) {
			dialog.show()
			return
		}
		document.getElementById('setup')?.scrollIntoView({ behavior: 'smooth' })
	}

	return (
		<>
			{/* Hero */}
			<section className="mx-auto max-w-[1100px] px-4 pb-10 pt-14 sm:px-6 md:px-8">
				<div className="grid items-center gap-10 md:grid-cols-[1fr_1fr] md:gap-12">
					<div>
						<p className="mb-3 text-xs font-semibold uppercase tracking-widest text-(--old-blue)">
							DefiLlama MCP Server
						</p>
						<h1 className="mb-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[2.75rem]">
							DeFi Data for{' '}
							<span className="bg-linear-to-r from-(--old-blue) to-[#8A8AFF] bg-clip-text text-transparent">
								AI Agents
							</span>
						</h1>
						<p className="mb-2 max-w-lg text-[15px] leading-relaxed text-(--text-tertiary)">
							Connect your AI agent to DefiLlama data. Ask questions about TVL, yields, token prices, protocol metrics,
							stablecoins, bridges, ETFs, and more. Your agent gets the answers directly.
						</p>
						<p className="mb-6 text-[13px] text-(--text-disabled)">
							Requires an API plan. Uses the same credits as your DefiLlama API key.
						</p>
						<div className="flex flex-wrap gap-3">
							<button
								onClick={handleGetStarted}
								className="rounded-md bg-(--old-blue) px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90"
							>
								Get Started
							</button>
							<a
								href="https://github.com/DefiLlama/defillama-skills"
								target="_blank"
								rel="noreferrer"
								onClick={() => trackUmamiEvent('mcp-github-click')}
								className="flex items-center gap-2 rounded-md border border-(--cards-border) bg-(--btn-bg) px-5 py-2.5 text-sm font-medium text-(--text-form) transition-all hover:bg-(--btn-hover-bg)"
							>
								<svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
									<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
								</svg>
								Skills Repo
							</a>
						</div>
					</div>
					<TerminalMock />
				</div>
				<ClientMarquee />
			</section>

			{/* Features */}
			<section className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6 md:px-8">
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<FeatureCard icon={<span>🔌</span>} title="23 DeFi Tools">
						TVL, fees, revenue, token prices, yields, stablecoins, bridges, ETFs, hacks, treasuries, and more, all
						accessible through natural language.
					</FeatureCard>
					<FeatureCard icon={<span>🔑</span>} title="Easy Setup">
						Paste the quick start prompt, your agent handles the rest. Works with Claude Code, OpenClaw, Cursor, Codex,
						Gemini CLI, and more.
					</FeatureCard>
					<FeatureCard icon={<span>💳</span>} title="Uses Your API Credits">
						Same credit pool as your DefiLlama API key. One credit per query. No separate billing. If you have an API
						plan, you're already set.
					</FeatureCard>
				</div>
			</section>

			{/* Quick Start */}
			<section id="setup" className="mx-auto max-w-[1100px] scroll-mt-20 px-4 py-12 sm:px-6 md:px-8">
				<SectionHeader
					overline="Quick Start"
					title="Paste This Into Your Agent"
					description="Copy this prompt and send it to your AI agent. It handles the rest."
				/>

				<CopyBox
					label="Paste into Claude, OpenClaw, or any AI agent"
					text="Read https://raw.githubusercontent.com/DefiLlama/defillama-skills/refs/heads/master/defillama-setup/SKILL.md and follow the instructions to connect to DefiLlama MCP"
				/>

				<ManualSetup />

				<div className="mt-10 grid gap-4 md:grid-cols-3">
					<StepCard step={1} title="Paste the URL">
						Add the URL above to your MCP client. That's the only config needed.
					</StepCard>
					<StepCard step={2} title="Authenticate">
						Your agent will prompt you to log in via browser on first use. Sign in with your DefiLlama account. API plan
						required.
					</StepCard>
					<StepCard step={3} title="Start querying">
						Ask your agent anything about DeFi. It calls the right tool automatically.
					</StepCard>
				</div>

				{/* LlamaAI Upsell */}
				<a
					href="/ai"
					onClick={() => trackUmamiEvent('mcp-llamaai-upsell-click')}
					className="group mt-10 flex flex-col gap-4 rounded-md border border-[#FDE0A9]/30 bg-linear-to-r from-[#FDE0A9]/5 to-[#FBEDCB]/5 p-5 transition-colors hover:border-[#FDE0A9]/50 sm:flex-row sm:items-center sm:justify-between sm:p-6"
				>
					<div className="flex items-start gap-4">
						<img
							src="/assets/llamaai/llamaai_animation.webp"
							alt="LlamaAI"
							width={56}
							height={56}
							className="shrink-0"
						/>
						<div>
							<h3 className="font-semibold text-(--text-primary)">
								Need more than raw data?{' '}
								<span className="bg-linear-to-r from-[#FDE0A9] to-[#d4a555] bg-clip-text text-transparent">
									Try LlamaAI
								</span>
							</h3>
							<p className="mt-1 max-w-lg text-sm text-(--text-tertiary)">
								Charts, onchain analysis, price forecasts, web search, and more. All in one AI chat. Available with the
								Pro plan at a lower price point.
							</p>
						</div>
					</div>
					<span className="shrink-0 self-start rounded-md border border-[#FDE0A9]/40 px-4 py-2 text-sm font-medium text-[#d4a555] transition-colors group-hover:bg-[#FDE0A9]/10 sm:self-center">
						Explore LlamaAI
					</span>
				</a>
			</section>

			{/* Tools */}
			<section id="tools" className="mx-auto max-w-[1100px] scroll-mt-20 px-4 py-12 sm:px-6 md:px-8">
				<SectionHeader overline="23 Tools" title="Everything DeFi, One Connection" />

				<div className="space-y-6">
					{toolCategories.map((cat, i) => (
						<ToolCategoryGroup key={cat.label} label={cat.label} tools={cat.tools} defaultOpen={i < 3} />
					))}
				</div>
			</section>

			{/* Skills */}
			<section className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6 md:px-8">
				<SectionHeader
					overline="Workflow Skills"
					title="Guided Research Workflows"
					description="Optional skills that teach your agent structured analysis patterns, turning raw tools into expert-level DeFi research. Installed automatically by the quick start prompt unless you opted to skip them."
				/>

				<div className="grid gap-2 sm:grid-cols-2">
					{skills.map((s) => (
						<div
							key={s.name}
							className="flex items-start gap-3 rounded-md border border-(--cards-border) bg-(--bg-card) px-4 py-3"
						>
							<span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--old-blue)/10">
								<svg
									viewBox="0 0 24 24"
									className="h-3 w-3"
									fill="none"
									stroke="var(--old-blue)"
									strokeWidth="2.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<polyline points="20 6 9 17 4 12" />
								</svg>
							</span>
							<div>
								<code className="font-jetbrains text-[13px] font-medium text-(--text-primary)">{s.name}</code>
								<p className="mt-0.5 text-xs text-(--text-tertiary)">{s.desc}</p>
							</div>
						</div>
					))}
				</div>

				<div className="mt-8">
					<h3 className="mb-3 text-sm font-semibold text-(--text-secondary)">Install skills manually</h3>
					<p className="mb-4 text-[13px] leading-relaxed text-(--text-tertiary)">
						The quick start prompt installs these automatically. To install manually, run:
					</p>
					<div className="mx-auto max-w-2xl">
						<CodeBlock label="Works with any agent">{`npx skills add DefiLlama/defillama-skills --yes`}</CodeBlock>
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="mx-auto max-w-[1100px] px-4 py-16 text-center sm:px-6 md:px-8">
				<h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">Ready to get started?</h2>
				<p className="mb-6 text-(--text-tertiary)">Requires an API plan. Uses the same credits as your API key.</p>
				<button
					onClick={handleGetStarted}
					className="rounded-md bg-(--old-blue) px-7 py-3 text-[15px] font-medium text-white shadow-sm transition-all hover:opacity-90"
				>
					Get Started
				</button>
			</section>

			{/* API Subscribe Modal */}
			<WalletProvider>
				<Ariakit.DialogProvider store={dialog}>
					<Ariakit.Dialog
						className="dialog flex max-h-[85dvh] max-w-md flex-col overflow-hidden rounded-xl border border-[#39393E] bg-[#1a1b1f] p-4 text-white shadow-2xl max-sm:drawer max-sm:rounded-b-none sm:p-6"
						portal
						unmountOnHide
					>
						<span className="mx-auto flex h-full w-full max-w-[440px] flex-col overflow-hidden">
							<Ariakit.DialogDismiss className="ml-auto shrink-0 rounded-full p-1.5 text-[#8a8c90] transition-colors hover:bg-[#39393E] hover:text-white">
								<Icon name="x" height={18} width={18} />
								<span className="sr-only">Close</span>
							</Ariakit.DialogDismiss>
							<div className="min-h-0 flex-1 overflow-y-auto">
								<SubscribeAPICard />
							</div>
						</span>
					</Ariakit.Dialog>
				</Ariakit.DialogProvider>
			</WalletProvider>
		</>
	)
}
