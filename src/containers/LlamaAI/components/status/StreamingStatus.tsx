import { memo, useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import {
	LLAMA_AI_ANIMATION_SRC,
	LLAMA_AI_HACKER_ANIMATION_SRC
} from '~/containers/LlamaAI/components/status/LlamaAIAnimationPreloads'
import { ThinkingPanel } from '~/containers/LlamaAI/components/status/ThinkingPanel'
import { formatTime } from '~/containers/LlamaAI/components/status/time'
import {
	TodoChecklistPanel,
	deriveTodosFromToolExecutions
} from '~/containers/LlamaAI/components/status/TodoChecklistPanel'
import { useCurrentSecond } from '~/containers/LlamaAI/components/status/useCurrentSecond'
import { useHackerMode } from '~/containers/LlamaAI/components/status/useHackerMode'
import type { RecoveryState } from '~/containers/LlamaAI/streamState'
import { getToolLabel, TOOL_ICONS } from '~/containers/LlamaAI/toolMetadata'
import type { SpawnAgentStatus, ToolCall } from '~/containers/LlamaAI/types'

export { ThinkingPanel, TodoChecklistPanel, deriveTodosFromToolExecutions, useHackerMode }

function ElapsedTimeLabel({ startedAt: serverStartedAt }: { startedAt?: number }) {
	const currentSecond = useCurrentSecond()
	const [fallbackStartSecond] = useState(() => Math.floor(Date.now() / 1000))
	const startSecond = serverStartedAt ? Math.floor(serverStartedAt / 1000) : fallbackStartSecond
	const elapsed = Math.max(0, currentSecond - startSecond)

	return <span className="font-mono text-xs text-[#999] tabular-nums dark:text-[#666]">{elapsed}s</span>
}
export function ToolProgressIndicator({
	toolCalls,
	thinking,
	isCompacting,
	spawnProgress,
	isWaiting,
	executionStartedAt,
	indentForActiveTodo,
	factCheckPhase
}: {
	toolCalls: ToolCall[]
	thinking?: string
	isCompacting?: boolean
	spawnProgress?: Map<string, SpawnAgentStatus>
	isWaiting?: boolean
	executionStartedAt?: number
	indentForActiveTodo?: boolean
	factCheckPhase?: 'drafting' | 'verifying' | 'finalizing' | null
}) {
	const hasSpawn = spawnProgress && spawnProgress.size > 0
	const hasActivity =
		toolCalls.length > 0 || !!thinking || !!isCompacting || hasSpawn || !!isWaiting || !!factCheckPhase
	const hackerMode = useHackerMode()

	if (!hasActivity) return null

	return (
		<section
			className={`flex gap-3 py-1.5 ${indentForActiveTodo ? 'border-l-2 border-[#e6e6e6] pl-4 dark:border-[#222324]' : ''}`}
			aria-label="LlamaAI progress"
		>
			<img
				src={hackerMode ? LLAMA_AI_HACKER_ANIMATION_SRC : LLAMA_AI_ANIMATION_SRC}
				alt=""
				className={`size-16 shrink-0 ${hackerMode ? 'rounded-lg drop-shadow-[0_0_8px_rgba(0,255,65,0.4)]' : ''}`}
				loading="eager"
				fetchPriority="high"
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
						{hackerMode ? (
							<>{'>'} infiltrating mainframe&hellip;</>
						) : factCheckPhase === 'drafting' ? (
							<>Drafting answer&hellip;</>
						) : factCheckPhase === 'verifying' ? (
							<>Checking claims&hellip;</>
						) : factCheckPhase === 'finalizing' ? (
							<>Preparing verified answer&hellip;</>
						) : (
							<>LlamaAI is thinking&hellip;</>
						)}
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
						<span className="text-xs font-medium text-[#444] dark:text-[#ccc]">Optimizing context memory&hellip;</span>
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
							Working in herd&hellip;
						</p>
						<ul className="flex flex-col gap-1 pl-5">
							{[...spawnProgress!.values()].map((agent) => (
								<li key={agent.id} className="flex animate-[fadeIn_0.25s_ease-out] items-center gap-2">
									{agent.status === 'completed' ? (
										<span className="text-[10px] text-green-500">✓</span>
									) : agent.status === 'error' ? (
										<span className="text-[10px] text-red-500">✗</span>
									) : (
										<span className="size-1.5 shrink-0 animate-pulse rounded-full bg-(--old-blue)" />
									)}
									<span className="text-xs text-[#666] dark:text-[#919296]">
										{agent.id}
										{agent.status === 'tool_call' && agent.tool ? (
											<span className="opacity-60"> — {getToolLabel(agent.tool)}</span>
										) : null}
										{agent.status === 'thinking' ? <span className="opacity-60"> — Thinking&hellip;</span> : null}
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
				<img src={LLAMA_AI_ANIMATION_SRC} alt="" className="size-6 shrink-0" loading="eager" fetchPriority="high" />

				<p className="m-0 flex-1 truncate text-xs text-[#666] sm:text-sm dark:text-[#919296]">
					{isResearchMode ? <>Researching in parallel&hellip;</> : <>Working in herd&hellip;</>}
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
								<span className="size-1.5 shrink-0 animate-pulse rounded-full bg-(--old-blue)" />
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
									<span className="opacity-60">
										{' '}
										- {agent.status === 'thinking' ? <>Thinking&hellip;</> : <>Starting&hellip;</>}
									</span>
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
						Connection lost. Reconnecting{recovery.attemptCount > 0 ? ` (attempt ${recovery.attemptCount})` : ''}
						&hellip;
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
