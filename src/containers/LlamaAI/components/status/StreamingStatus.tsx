import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import type { SpawnAgentStatus, ToolCall } from '~/containers/LlamaAI/types'

export const TOOL_LABELS: Record<string, string> = {
	execute_sql: 'Querying database',
	resolve_entity: 'Resolving entity',
	load_skill: 'Loading knowledge',
	generate_chart: 'Generating visualization',
	web_search: 'Searching the web',
	x_search: 'Searching X/Twitter',
	spawn_agent: 'Spawning research agents',
	export_csv: 'Exporting CSV',
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
	x_get_community_posts: 'Fetching community posts'
}

export const TOOL_ICONS: Record<string, { icon: string; color: string }> = {
	execute_sql: { icon: 'layers', color: '#6366f1' },
	resolve_entity: { icon: 'search', color: '#a78bfa' },
	load_skill: { icon: 'graduation-cap', color: '#34d399' },
	generate_chart: { icon: 'bar-chart-2', color: '#f59e0b' },
	web_search: { icon: 'earth', color: '#22d3ee' },
	x_search: { icon: 'twitter', color: '#94a3b8' },
	spawn_agent: { icon: 'users', color: '#f472b6' },
	export_csv: { icon: 'sheets', color: '#4ade80' },
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
	x_get_community_posts: { icon: 'twitter', color: '#94a3b8' }
}

function formatTime(seconds: number) {
	const minutes = Math.floor(seconds / 60)
	const remainder = seconds % 60
	return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`
}

export function ThinkingPanel({ thinking, defaultOpen = false }: { thinking: string; defaultOpen?: boolean }) {
	const contentRef = useRef<HTMLDivElement>(null)
	const [isOpen, setIsOpen] = useState(defaultOpen)

	useEffect(() => {
		if (isOpen && contentRef.current) {
			contentRef.current.scrollTop = contentRef.current.scrollHeight
		}
	}, [thinking, isOpen])

	if (!thinking) return null

	return (
		<details className="group" open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)}>
			<summary className="flex items-center gap-1 text-xs text-[#555] dark:text-[#aaa]">
				<span className="inline-block transition-transform duration-150 group-open:rotate-90">&#9656;</span>
				<span>Reasoning</span>
			</summary>
			<div
				ref={contentRef}
				className="mt-1 max-h-[120px] overflow-y-auto pl-3 font-mono text-xs leading-[1.6] whitespace-pre-wrap text-[#555] dark:text-[#aaa]"
			>
				{thinking}
			</div>
		</details>
	)
}

function ElapsedTimeLabel() {
	const [elapsed, setElapsed] = useState(0)

	useEffect(() => {
		const startedAt = Date.now()
		const interval = setInterval(() => {
			setElapsed(Math.floor((Date.now() - startedAt) / 1000))
		}, 1000)

		return () => clearInterval(interval)
	}, [])

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
	isCompacting
}: {
	toolCalls: ToolCall[]
	thinking?: string
	isCompacting?: boolean
}) {
	const hasActivity = toolCalls.length > 0 || !!thinking || !!isCompacting

	if (!hasActivity) return null

	return (
		<section className="flex gap-3 py-1.5" aria-label="LlamaAI progress">
			<img src="/assets/llamaai/llamaai_animation.webp" alt="" className="h-16 w-16 shrink-0" />
			<div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
				<div className="flex flex-col gap-0.5">
					<p className="m-0 text-base font-semibold text-[#555] dark:text-[#919296]">LlamaAI is thinking...</p>
					<ElapsedTimeLabel />
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
								</li>
							)
						})}
					</ul>
				) : null}
			</div>
		</section>
	)
}

export const SpawnProgressCard = memo(function SpawnProgressCard({
	agents,
	startTime
}: {
	agents: Map<string, SpawnAgentStatus>
	startTime: number
}) {
	const [elapsed, setElapsed] = useState(0)
	const [isExpanded, setIsExpanded] = useState(true)

	useEffect(() => {
		if (!startTime) return
		const interval = setInterval(() => {
			setElapsed(Math.floor((Date.now() - startTime) / 1000))
		}, 1000)
		return () => clearInterval(interval)
	}, [startTime])

	const agentList = useMemo(() => [...agents.values()], [agents])
	const completed = agentList.filter((agent) => agent.status === 'completed').length
	const total = agentList.length

	return (
		<section
			className="flex flex-col gap-2 rounded-lg border border-[#e6e6e6] bg-(--cards-bg) p-2 sm:p-3 dark:border-[#222324]"
			aria-label="Parallel research progress"
		>
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="flex items-center gap-2 text-left sm:gap-3"
			>
				<img src="/assets/llamaai/llamaai_animation.webp" alt="" className="h-6 w-6 shrink-0" />

				<p className="m-0 flex-1 truncate text-xs text-[#666] sm:text-sm dark:text-[#919296]">
					Researching in parallel...
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
									<span className="opacity-60"> - {TOOL_LABELS[agent.tool] || agent.tool}</span>
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
								{agent.status === 'started' ? <span className="opacity-60"> - Starting...</span> : null}
								{agent.status === 'error' ? <span className="opacity-60"> - Error</span> : null}
							</p>
						</li>
					))}
				</ul>
			) : null}
		</section>
	)
})
