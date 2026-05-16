import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Icon } from '~/components/Icon'
import { useLlamaAISetting } from '~/containers/LlamaAI/hooks/useLlamaAISettings'
import type { RecoveryState } from '~/containers/LlamaAI/streamState'
import type { SpawnAgentStatus, TodoItem, ToolCall } from '~/containers/LlamaAI/types'
import { useDarkModeManager } from '~/contexts/LocalStorage'

export const TOOL_LABELS: Record<string, string> = {
	execute_sql: 'Querying database',
	resolve_entity: 'Resolving entity',
	load_skill: 'Loading knowledge',
	generate_chart: 'Generating visualization',
	generate_image: 'Generating image',
	web_search: 'Searching the web',
	x_search: 'Searching X/Twitter',
	spawn_agent: 'Spawning parallel agents',
	export_csv: 'Exporting CSV',
	export_markdown: 'Exporting Markdown',
	create_alert: 'Creating alert',
	valyu_search: 'Searching financial data',
	execute_code: 'Running code',
	read_url: 'Reading URL',
	get_polymarket_data: 'Fetching prediction markets',
	get_wallet_data: 'Fetching wallet data',
	get_token_data: 'Fetching token data',
	get_tx_data: 'Fetching transaction data',
	get_kg_enrichment: 'Enriching knowledge graph',
	get_feed_enrichment: 'Enriching feed data',
	get_docs: 'Reading documentation',
	list_alerts: 'Listing alerts',
	manage_alert: 'Managing alert',
	search_adapters: 'Searching adapters',
	get_adapter_code: 'Reading adapter code',
	query_logs: 'Querying logs',
	call_contract: 'Calling contract',
	get_contract: 'Fetching contract',
	get_monte_carlo_forecast: 'Running Monte Carlo forecast',
	get_tsmom: 'Computing momentum signal',
	get_governance_data: 'Fetching governance data',
	manage_user_memory: 'Updating memory',
	flag_capability_gap: 'Flagging capability gap',
	x_advanced_search: 'Searching X/Twitter',
	x_get_user: 'Fetching X user profile',
	x_get_user_by_id: 'Fetching X user profile',
	x_get_users: 'Fetching X users',
	x_get_tweets: 'Fetching tweets',
	x_get_tweet: 'Fetching tweet',
	x_get_user_tweets: 'Fetching user tweets',
	x_search_users: 'Searching X users',
	x_get_followers: 'Fetching X followers',
	x_get_following: 'Fetching X following',
	x_get_quote_tweets: 'Fetching quote tweets',
	x_get_replies: 'Fetching replies',
	x_get_retweeted_by: 'Fetching retweets',
	x_get_community: 'Fetching X community',
	x_get_community_members: 'Fetching community members',
	x_get_community_posts: 'Fetching community posts',
	query_allium: 'Querying onchain data',
	query_dune: 'Querying Dune',
	x_semantic_search: 'Searching X/Twitter',
	apollo_org_search: 'Searching organizations',
	apollo_people_search: 'Searching people',
	apollo_people_enrich: 'Enriching people data',
	apollo_org_enrich: 'Enriching org data',
	clado_linkedin_scrape: 'Scraping LinkedIn profile',
	clado_contacts_enrich: 'Enriching contact data',
	feed_enrichment: 'Enriching feed data',
	generate_dashboard: 'Generating dashboard',
	dashboard_generation_history: 'Loading dashboard history',
	load_dashboard: 'Loading dashboard',
	fetch_ohlcv: 'Fetching price data',
	fetch_exchange_data: 'Fetching exchange data',
	get_balance_history: 'Fetching balance history',
	read_result: 'Reading result',
	list_results: 'Listing results',
	x_get_article: 'Reading X article',
	nansen_smart_money_holdings: 'Fetching smart money holdings',
	nansen_smart_money_trades: 'Fetching smart money trades',
	nansen_smart_money_netflow: 'Fetching smart money netflow',
	nansen_token_screener: 'Screening tokens',
	nansen_token_holders: 'Fetching token holders',
	nansen_who_bought_sold: 'Fetching buy/sell data',
	nansen_flow_intelligence: 'Fetching flow intelligence',
	nansen_token_trades: 'Fetching token trades',
	nansen_token_flows: 'Fetching token flows',
	nansen_pnl_leaderboard: 'Fetching PnL leaderboard',
	nansen_pm_event_screener: 'Screening prediction events',
	nansen_pm_market_screener: 'Screening prediction markets',
	nansen_pm_top_holders: 'Fetching top holders',
	nansen_pm_trades: 'Fetching market trades',
	nansen_pm_pnl: 'Fetching market PnL',
	nansen_pm_ohlcv: 'Fetching market OHLCV'
}

export const getToolLabel = (name: string): string =>
	TOOL_LABELS[name] ??
	name
		.split('_')
		.map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
		.join(' ')

export const TOOL_ICONS: Record<string, { icon: string; color: string }> = {
	execute_sql: { icon: 'layers', color: '#6366f1' },
	resolve_entity: { icon: 'search', color: '#a78bfa' },
	load_skill: { icon: 'graduation-cap', color: '#34d399' },
	generate_chart: { icon: 'bar-chart-2', color: '#f59e0b' },
	generate_image: { icon: 'image-plus', color: '#2172E5' },
	web_search: { icon: 'earth', color: '#22d3ee' },
	x_search: { icon: 'twitter', color: '#94a3b8' },
	spawn_agent: { icon: 'users', color: '#f472b6' },
	export_csv: { icon: 'sheets', color: '#4ade80' },
	export_markdown: { icon: 'file-text', color: '#60a5fa' },
	create_alert: { icon: 'sparkles', color: '#fbbf24' },
	valyu_search: { icon: 'search', color: '#10b981' },
	execute_code: { icon: 'code', color: '#8b5cf6' },
	read_url: { icon: 'earth', color: '#06b6d4' },
	get_polymarket_data: { icon: 'activity', color: '#ec4899' },
	get_wallet_data: { icon: 'wallet', color: '#f97316' },
	get_token_data: { icon: 'dollar-sign', color: '#eab308' },
	get_tx_data: { icon: 'repeat', color: '#14b8a6' },
	get_kg_enrichment: { icon: 'layers', color: '#6366f1' },
	get_feed_enrichment: { icon: 'layers', color: '#8b5cf6' },
	get_docs: { icon: 'file-text', color: '#22d3ee' },
	list_alerts: { icon: 'sparkles', color: '#fbbf24' },
	manage_alert: { icon: 'sparkles', color: '#fbbf24' },
	search_adapters: { icon: 'search', color: '#a78bfa' },
	get_adapter_code: { icon: 'code', color: '#a78bfa' },
	query_logs: { icon: 'file-text', color: '#94a3b8' },
	call_contract: { icon: 'plug', color: '#6366f1' },
	get_contract: { icon: 'plug', color: '#6366f1' },
	get_monte_carlo_forecast: { icon: 'trending-up', color: '#f472b6' },
	get_tsmom: { icon: 'trending-up', color: '#f59e0b' },
	get_governance_data: { icon: 'users', color: '#8b5cf6' },
	manage_user_memory: { icon: 'bookmark', color: '#34d399' },
	flag_capability_gap: { icon: 'flag', color: '#f43f5e' },
	x_advanced_search: { icon: 'twitter', color: '#94a3b8' },
	x_get_user: { icon: 'twitter', color: '#94a3b8' },
	x_get_user_by_id: { icon: 'twitter', color: '#94a3b8' },
	x_get_users: { icon: 'twitter', color: '#94a3b8' },
	x_get_tweets: { icon: 'twitter', color: '#94a3b8' },
	x_get_tweet: { icon: 'twitter', color: '#94a3b8' },
	x_get_user_tweets: { icon: 'twitter', color: '#94a3b8' },
	x_search_users: { icon: 'twitter', color: '#94a3b8' },
	x_get_followers: { icon: 'twitter', color: '#94a3b8' },
	x_get_following: { icon: 'twitter', color: '#94a3b8' },
	x_get_quote_tweets: { icon: 'twitter', color: '#94a3b8' },
	x_get_replies: { icon: 'twitter', color: '#94a3b8' },
	x_get_retweeted_by: { icon: 'twitter', color: '#94a3b8' },
	x_get_community: { icon: 'twitter', color: '#94a3b8' },
	x_get_community_members: { icon: 'twitter', color: '#94a3b8' },
	x_get_community_posts: { icon: 'twitter', color: '#94a3b8' },
	query_allium: { icon: 'layers', color: '#6366f1' },
	query_dune: { icon: 'layers', color: '#f59e0b' },
	x_semantic_search: { icon: 'twitter', color: '#94a3b8' },
	apollo_org_search: { icon: 'search', color: '#8b5cf6' },
	apollo_people_search: { icon: 'users', color: '#8b5cf6' },
	apollo_people_enrich: { icon: 'users', color: '#a78bfa' },
	apollo_org_enrich: { icon: 'search', color: '#a78bfa' },
	clado_linkedin_scrape: { icon: 'users', color: '#0077b5' },
	clado_contacts_enrich: { icon: 'users', color: '#0077b5' },
	feed_enrichment: { icon: 'layers', color: '#8b5cf6' },
	generate_dashboard: { icon: 'layout-grid', color: '#2563eb' },
	dashboard_generation_history: { icon: 'layout-grid', color: '#6366f1' },
	load_dashboard: { icon: 'layout-grid', color: '#6366f1' },
	fetch_ohlcv: { icon: 'bar-chart-2', color: '#f59e0b' },
	fetch_exchange_data: { icon: 'bar-chart-2', color: '#f97316' },
	get_balance_history: { icon: 'wallet', color: '#f97316' },
	read_result: { icon: 'file-text', color: '#94a3b8' },
	list_results: { icon: 'file-text', color: '#94a3b8' },
	x_get_article: { icon: 'twitter', color: '#94a3b8' },
	nansen_smart_money_holdings: { icon: 'trending-up', color: '#2563eb' },
	nansen_smart_money_trades: { icon: 'trending-up', color: '#2563eb' },
	nansen_smart_money_netflow: { icon: 'trending-up', color: '#2563eb' },
	nansen_token_screener: { icon: 'search', color: '#2563eb' },
	nansen_token_holders: { icon: 'users', color: '#2563eb' },
	nansen_who_bought_sold: { icon: 'repeat', color: '#2563eb' },
	nansen_flow_intelligence: { icon: 'activity', color: '#2563eb' },
	nansen_token_trades: { icon: 'repeat', color: '#2563eb' },
	nansen_token_flows: { icon: 'activity', color: '#2563eb' },
	nansen_pnl_leaderboard: { icon: 'trending-up', color: '#2563eb' },
	nansen_pm_event_screener: { icon: 'activity', color: '#ec4899' },
	nansen_pm_market_screener: { icon: 'search', color: '#ec4899' },
	nansen_pm_top_holders: { icon: 'users', color: '#ec4899' },
	nansen_pm_trades: { icon: 'repeat', color: '#ec4899' },
	nansen_pm_pnl: { icon: 'trending-up', color: '#ec4899' },
	nansen_pm_ohlcv: { icon: 'bar-chart-2', color: '#ec4899' }
}

let currentSecondSnapshot = Math.floor(Date.now() / 1000)
const currentSecondListeners = new Set<() => void>()
let currentSecondIntervalId: number | null = null

function notifyCurrentSecondListeners() {
	for (const listener of currentSecondListeners) {
		listener()
	}
}

function syncCurrentSecondSnapshot() {
	const nextSecond = Math.floor(Date.now() / 1000)
	if (nextSecond === currentSecondSnapshot) return
	currentSecondSnapshot = nextSecond
	notifyCurrentSecondListeners()
}

function subscribeToCurrentSecond(listener: () => void) {
	currentSecondListeners.add(listener)
	syncCurrentSecondSnapshot()

	if (currentSecondIntervalId === null && typeof window !== 'undefined') {
		currentSecondIntervalId = window.setInterval(syncCurrentSecondSnapshot, 1000)
	}

	return () => {
		currentSecondListeners.delete(listener)
		if (currentSecondListeners.size === 0 && currentSecondIntervalId !== null) {
			window.clearInterval(currentSecondIntervalId)
			currentSecondIntervalId = null
		}
	}
}

function useCurrentSecond() {
	return useSyncExternalStore(
		subscribeToCurrentSecond,
		() => currentSecondSnapshot,
		() => currentSecondSnapshot
	)
}

function formatTime(seconds: number) {
	const minutes = Math.floor(seconds / 60)
	const remainder = seconds % 60
	return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`
}

export function useHackerMode() {
	const [isDark] = useDarkModeManager()
	const enabled = useLlamaAISetting('hackerMode')
	return enabled && isDark
}

export function ThinkingPanel({ thinking, defaultOpen = false }: { thinking: string; defaultOpen?: boolean }) {
	const detailsRef = useRef<HTMLDetailsElement>(null)
	const contentRef = useRef<HTMLDivElement>(null)
	const shouldAutoScrollRef = useRef(true)
	const hackerMode = useHackerMode()

	const syncAutoScrollIntent = useCallback(() => {
		const content = contentRef.current
		if (!content) return
		shouldAutoScrollRef.current = Math.ceil(content.scrollTop + content.clientHeight) >= content.scrollHeight - 16
	}, [])

	const scrollContentToBottom = useCallback((force = false) => {
		requestAnimationFrame(() => {
			const content = contentRef.current
			if (!content || (!force && !shouldAutoScrollRef.current)) return
			content.scrollTop = content.scrollHeight
			shouldAutoScrollRef.current = true
		})
	}, [])

	useEffect(() => {
		if (defaultOpen && detailsRef.current) {
			detailsRef.current.open = true
			scrollContentToBottom(true)
		}
	}, [defaultOpen, scrollContentToBottom])

	useEffect(() => {
		if (detailsRef.current?.open) {
			scrollContentToBottom()
		}
	}, [thinking, scrollContentToBottom])

	if (!thinking) return null

	return (
		<details
			ref={detailsRef}
			className="group"
			onToggle={() => {
				if (detailsRef.current?.open) {
					scrollContentToBottom(true)
				}
			}}
		>
			<summary
				className={
					hackerMode
						? 'flex items-center gap-1 text-xs text-[#00ff41] drop-shadow-[0_0_6px_rgba(0,255,65,0.5)]'
						: 'flex items-center gap-1 text-xs text-[#555] dark:text-[#aaa]'
				}
			>
				<span className="inline-block transition-transform duration-150 group-open:rotate-90">&#9656;</span>
				<span>{hackerMode ? '> decrypting...' : 'Reasoning'}</span>
			</summary>
			<div
				ref={contentRef}
				onScroll={syncAutoScrollIntent}
				className={
					hackerMode
						? 'mt-1 h-[160px] min-h-[40px] resize-y overflow-y-auto rounded-md border border-[#00ff41]/20 bg-[#0d0d0d] p-3 font-mono text-xs leading-[1.6] whitespace-pre-wrap text-[#00ff41] shadow-[inset_0_0_30px_rgba(0,255,65,0.03)] drop-shadow-[0_0_4px_rgba(0,255,65,0.3)]'
						: 'mt-1 h-[120px] min-h-[40px] resize-y overflow-y-auto pl-3 font-mono text-xs leading-[1.6] whitespace-pre-wrap text-[#555] dark:text-[#aaa]'
				}
				style={hackerMode ? { textShadow: '0 0 8px rgba(0,255,65,0.4)' } : undefined}
			>
				{thinking}
			</div>
		</details>
	)
}

function ElapsedTimeLabel({ startedAt: serverStartedAt }: { startedAt?: number }) {
	const currentSecond = useCurrentSecond()
	const [fallbackStartSecond] = useState(() => Math.floor(Date.now() / 1000))
	const startSecond = serverStartedAt ? Math.floor(serverStartedAt / 1000) : fallbackStartSecond
	const elapsed = Math.max(0, currentSecond - startSecond)

	return <span className="font-mono text-xs text-[#999] tabular-nums dark:text-[#666]">{elapsed}s</span>
}

export function TypingIndicator() {
	return (
		<div className="flex items-center gap-1.5 py-2">
			<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#666] [animation-delay:0ms] dark:bg-[#919296]" />
			<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#666] [animation-delay:150ms] dark:bg-[#919296]" />
			<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#666] [animation-delay:300ms] dark:bg-[#919296]" />
		</div>
	)
}

export function ToolProgressIndicator({
	toolCalls,
	thinking,
	isCompacting,
	spawnProgress,
	isWaiting,
	executionStartedAt,
	indentForActiveTodo
}: {
	toolCalls: ToolCall[]
	thinking?: string
	isCompacting?: boolean
	spawnProgress?: Map<string, SpawnAgentStatus>
	isWaiting?: boolean
	executionStartedAt?: number
	indentForActiveTodo?: boolean
}) {
	const hasSpawn = spawnProgress && spawnProgress.size > 0
	const hasActivity = toolCalls.length > 0 || !!thinking || !!isCompacting || hasSpawn || !!isWaiting
	const hackerMode = useHackerMode()

	if (!hasActivity) return null

	return (
		<section
			className={`flex gap-3 py-1.5 ${indentForActiveTodo ? 'border-l-2 border-[#e6e6e6] pl-4 dark:border-[#222324]' : ''}`}
			aria-label="LlamaAI progress"
		>
			<img
				src={hackerMode ? '/assets/llamaai/hackerllama.webp' : '/assets/llamaai/llamaai_animation.webp'}
				alt=""
				className={`h-16 w-16 shrink-0 ${hackerMode ? 'rounded-lg drop-shadow-[0_0_8px_rgba(0,255,65,0.4)]' : ''}`}
			/>
			<div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
				<div className="flex flex-col gap-0.5">
					<p
						className={
							hackerMode
								? 'm-0 font-mono text-base font-semibold text-[#00ff41] drop-shadow-[0_0_6px_rgba(0,255,65,0.5)]'
								: 'm-0 text-base font-semibold text-[#555] dark:text-[#919296]'
						}
					>
						{hackerMode ? '> infiltrating mainframe...' : 'LlamaAI is thinking...'}
					</p>
					<ElapsedTimeLabel startedAt={executionStartedAt} />
				</div>
				{thinking ? <ThinkingPanel thinking={thinking} defaultOpen /> : null}
				{isCompacting ? (
					<p className="m-0 flex animate-[fadeIn_0.25s_ease-out] items-center gap-2">
						<Icon
							name="layers"
							height={14}
							width={14}
							className="shrink-0 animate-pulse opacity-70"
							style={{ color: '#8b5cf6' }}
						/>
						<span className="text-xs font-medium text-[#444] dark:text-[#ccc]">Optimizing context memory...</span>
					</p>
				) : null}
				{toolCalls.length > 0 ? (
					<ul className="flex flex-col gap-1.5">
						{toolCalls.map((toolCall) => {
							const meta = TOOL_ICONS[toolCall.name] || { icon: 'sparkles', color: '#919296' }
							return (
								<li key={toolCall.id} className="flex animate-[fadeIn_0.25s_ease-out] items-center gap-2">
									<Icon
										name={meta.icon as never}
										height={14}
										width={14}
										className="shrink-0 opacity-70"
										style={{ color: meta.color }}
									/>
									<p className="m-0 text-xs font-medium text-[#444] dark:text-[#ccc]">{toolCall.label}</p>
									{toolCall.isPremium ? (
										<span className="rounded-full bg-amber-100 px-1.5 py-px text-[9px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
											Premium
										</span>
									) : null}
								</li>
							)
						})}
					</ul>
				) : null}
				{hasSpawn ? (
					<div className="flex flex-col gap-1.5">
						<p className="m-0 flex items-center gap-2 text-xs font-medium text-[#444] dark:text-[#ccc]">
							<Icon name="users" height={14} width={14} className="shrink-0 opacity-70" style={{ color: '#f472b6' }} />
							Working in herd...
						</p>
						<ul className="flex flex-col gap-1 pl-5">
							{[...spawnProgress!.values()].map((agent) => (
								<li key={agent.id} className="flex animate-[fadeIn_0.25s_ease-out] items-center gap-2">
									{agent.status === 'completed' ? (
										<span className="text-[10px] text-green-500">✓</span>
									) : agent.status === 'error' ? (
										<span className="text-[10px] text-red-500">✗</span>
									) : (
										<span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-(--old-blue)" />
									)}
									<span className="text-xs text-[#666] dark:text-[#919296]">
										{agent.id}
										{agent.status === 'tool_call' && agent.tool ? (
											<span className="opacity-60"> — {getToolLabel(agent.tool)}</span>
										) : null}
										{agent.status === 'thinking' ? <span className="opacity-60"> — Thinking...</span> : null}
										{agent.status === 'completed' ? <span className="opacity-60"> — Done</span> : null}
									</span>
								</li>
							))}
						</ul>
					</div>
				) : null}
			</div>
		</section>
	)
}

export const SpawnProgressCard = memo(function SpawnProgressCard({
	agents,
	startTime,
	isResearchMode,
	recovery,
	onReconnect,
	indentForActiveTodo
}: {
	agents: Map<string, SpawnAgentStatus>
	startTime: number
	isResearchMode?: boolean
	recovery?: RecoveryState
	onReconnect?: () => void
	indentForActiveTodo?: boolean
}) {
	const currentSecond = useCurrentSecond()
	const elapsed = startTime ? Math.max(0, currentSecond - Math.floor(startTime / 1000)) : 0
	const [isExpanded, setIsExpanded] = useState(true)

	const agentList = useMemo(() => [...agents.values()], [agents])
	const completed = agentList.filter((agent) => agent.status === 'completed').length
	const total = agentList.length

	return (
		<section
			className={`flex flex-col gap-2 rounded-lg border border-[#e6e6e6] bg-(--cards-bg) p-2 sm:p-3 dark:border-[#222324] ${indentForActiveTodo ? 'ml-4 border-l-2' : ''}`}
			aria-label={isResearchMode ? 'Parallel research progress' : 'Herd work progress'}
		>
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="flex items-center gap-2 text-left sm:gap-3"
			>
				<img src="/assets/llamaai/llamaai_animation.webp" alt="" className="h-6 w-6 shrink-0" />

				<p className="m-0 flex-1 truncate text-xs text-[#666] sm:text-sm dark:text-[#919296]">
					{isResearchMode ? 'Researching in parallel...' : 'Working in herd...'}
				</p>

				<p className="m-0 flex shrink-0 items-center gap-1 rounded bg-[rgba(0,0,0,0.04)] px-1.5 py-0.5 text-[10px] text-[#666] sm:text-xs dark:bg-[rgba(145,146,150,0.12)] dark:text-[#919296]">
					{completed}/{total} done
				</p>

				<time className="flex shrink-0 items-center gap-1 rounded bg-[rgba(0,0,0,0.04)] px-1.5 py-0.5 font-mono text-[10px] text-[#666] tabular-nums sm:text-xs dark:bg-[rgba(145,146,150,0.12)] dark:text-[#919296]">
					{formatTime(elapsed)}
				</time>

				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="hidden shrink-0 text-[#666] sm:block dark:text-[#919296]"
				>
					{isExpanded ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
				</svg>
			</button>

			{isExpanded ? (
				<ul className="flex flex-col gap-1 border-t border-[#e6e6e6] pt-2 dark:border-[#222324]">
					{agentList.map((agent) => (
						<li key={agent.id} className="flex items-center gap-2 pl-1">
							{agent.status === 'completed' ? (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="3"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="shrink-0 text-green-500"
								>
									<polyline points="20 6 9 17 4 12" />
								</svg>
							) : agent.status === 'error' ? (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="3"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="shrink-0 text-red-500"
								>
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							) : (
								<span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-(--old-blue)" />
							)}
							<p className="m-0 text-xs text-[#666] dark:text-[#919296]">
								{agent.id}
								{agent.status === 'tool_call' && agent.tool ? (
									<span className="opacity-60"> - {getToolLabel(agent.tool)}</span>
								) : null}
								{agent.status === 'completed' ? (
									<span className="opacity-60">
										{' '}
										- Complete
										{agent.toolCount != null || agent.chartCount != null ? ' (' : ''}
										{agent.toolCount != null ? `${agent.toolCount} tools` : ''}
										{agent.toolCount != null && agent.chartCount != null ? ', ' : ''}
										{agent.chartCount != null ? `${agent.chartCount} charts` : ''}
										{agent.toolCount != null || agent.chartCount != null ? ')' : ''}
									</span>
								) : null}
								{agent.status === 'started' || agent.status === 'thinking' ? (
									<span className="opacity-60"> - {agent.status === 'thinking' ? 'Thinking...' : 'Starting...'}</span>
								) : null}
								{agent.status === 'error' ? <span className="opacity-60"> - Error</span> : null}
							</p>
						</li>
					))}
				</ul>
			) : null}

			{recovery?.status === 'reconnecting' ? (
				<div className="flex items-center gap-2 border-t border-amber-200 pt-2 dark:border-amber-900/50">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="shrink-0 animate-spin text-amber-500"
					>
						<path d="M21 12a9 9 0 1 1-6.219-8.56" />
					</svg>
					<p className="m-0 flex-1 text-xs text-amber-700 dark:text-amber-300">
						Connection lost. Reconnecting{recovery.attemptCount > 0 ? ` (attempt ${recovery.attemptCount})` : ''}...
					</p>
					{onReconnect ? (
						<button
							type="button"
							onClick={onReconnect}
							className="shrink-0 rounded-md bg-amber-200 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700"
						>
							Reconnect now
						</button>
					) : null}
				</div>
			) : null}
		</section>
	)
})

const TODO_STATUS_ORDER: Record<TodoItem['status'], number> = {
	in_progress: 0,
	pending: 1,
	completed: 2,
	cancelled: 3
}

function TodoStatusIcon({ status }: { status: TodoItem['status'] }) {
	if (status === 'completed') {
		return (
			<span
				aria-hidden="true"
				className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border border-green-500 bg-green-500 text-[10px] font-bold text-white"
			>
				✓
			</span>
		)
	}
	if (status === 'in_progress') {
		return (
			<span
				aria-hidden="true"
				className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border border-(--old-blue)"
			>
				<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-(--old-blue)" />
			</span>
		)
	}
	if (status === 'cancelled') {
		return (
			<span
				aria-hidden="true"
				className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border border-[#d1d5db] text-[10px] text-[#9ca3af] line-through dark:border-[#3f3f46]"
			>
				✕
			</span>
		)
	}
	return (
		<span
			aria-hidden="true"
			className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border border-[#d1d5db] dark:border-[#3f3f46]"
		/>
	)
}

export function TodoChecklistPanel({
	todos,
	startTime,
	isLive = false
}: {
	todos: TodoItem[]
	startTime?: number
	isLive?: boolean
}) {
	const currentSecond = useCurrentSecond()
	const orderedTodos = useMemo(() => {
		const seen = new Set<string>()
		const out: TodoItem[] = []
		for (const item of todos) {
			if (seen.has(item.id)) continue
			seen.add(item.id)
			out.push(item)
		}
		return out
	}, [todos])
	if (orderedTodos.length === 0) return null
	const completed = orderedTodos.filter((t) => t.status === 'completed').length
	const total = orderedTodos.filter((t) => t.status !== 'cancelled').length
	const showElapsed = isLive && !!startTime
	const elapsed = showElapsed ? Math.max(0, currentSecond - Math.floor(startTime! / 1000)) : 0
	return (
		<section
			className="flex flex-col gap-1.5 rounded-lg border border-[#e6e6e6] bg-(--cards-bg) p-2 sm:p-2.5 dark:border-[#222324]"
			aria-label="Plan"
		>
			<div className="flex items-center gap-2 px-0.5">
				<span aria-hidden="true" className="text-sm">
					📋
				</span>
				<p className="m-0 flex-1 truncate text-xs font-medium text-[#444] sm:text-sm dark:text-[#ccc]">Plan</p>
				<p className="m-0 shrink-0 rounded bg-[rgba(0,0,0,0.04)] px-1.5 py-0.5 text-[10px] text-[#666] sm:text-xs dark:bg-[rgba(145,146,150,0.12)] dark:text-[#919296]">
					{completed}/{total} done
				</p>
				{showElapsed ? (
					<time className="flex shrink-0 items-center gap-1 rounded bg-[rgba(0,0,0,0.04)] px-1.5 py-0.5 font-mono text-[10px] text-[#666] tabular-nums sm:text-xs dark:bg-[rgba(145,146,150,0.12)] dark:text-[#919296]">
						{formatTime(elapsed)}
					</time>
				) : null}
			</div>
			<ul className="flex flex-col gap-1">
				{orderedTodos.map((todo) => {
					const isActive = todo.status === 'in_progress'
					const isCompleted = todo.status === 'completed'
					const isCancelled = todo.status === 'cancelled'
					return (
						<li key={todo.id} className="flex items-start gap-2 px-0.5 py-0.5">
							<span className="mt-0.5">
								<TodoStatusIcon status={todo.status} />
							</span>
							<p
								className={`m-0 flex-1 text-xs leading-[1.45] sm:text-sm ${
									isActive
										? 'font-medium text-[#444] dark:text-[#e6e6e6]'
										: isCompleted
											? 'text-[#888] line-through dark:text-[#777]'
											: isCancelled
												? 'text-[#aaa] line-through dark:text-[#666]'
												: 'text-[#666] dark:text-[#919296]'
								}`}
							>
								{todo.content}
							</p>
						</li>
					)
				})}
			</ul>
		</section>
	)
}

export function deriveTodosFromToolExecutions(
	toolExecutions: Array<{ name?: string; toolData?: unknown }> | undefined
): TodoItem[] {
	if (!toolExecutions || toolExecutions.length === 0) return []
	for (let i = toolExecutions.length - 1; i >= 0; i--) {
		const exec = toolExecutions[i]
		if (exec?.name !== 'todo') continue
		const data = exec.toolData as { todos?: unknown } | undefined
		if (!data || !Array.isArray(data.todos)) continue
		const valid: TodoItem[] = []
		for (const raw of data.todos) {
			if (!raw || typeof raw !== 'object') continue
			const item = raw as Partial<TodoItem>
			if (!item.id || !item.content || !item.status) continue
			if (TODO_STATUS_ORDER[item.status as TodoItem['status']] === undefined) continue
			valid.push({
				id: String(item.id),
				content: String(item.content),
				status: item.status as TodoItem['status']
			})
		}
		return valid
	}
	return []
}
