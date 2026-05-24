import { useMemo } from 'react'
import { formatTime } from '~/containers/LlamaAI/components/status/time'
import { useCurrentSecond } from '~/containers/LlamaAI/components/status/useCurrentSecond'
import type { TodoItem } from '~/containers/LlamaAI/types'

const TODO_STATUS_ORDER: Record<TodoItem['status'], number> = {
	in_progress: 0,
	pending: 1,
	completed: 2,
	cancelled: 3
}

function TodoStatusIcon({ status, animated = true }: { status: TodoItem['status']; animated?: boolean }) {
	if (status === 'completed') {
		return (
			<span
				aria-hidden="true"
				className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-sm border border-green-500 bg-green-500 text-[10px] font-bold text-white"
			>
				✓
			</span>
		)
	}
	if (status === 'in_progress') {
		return (
			<span
				aria-hidden="true"
				className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-sm border border-(--old-blue)"
			>
				<span className={`size-1.5 rounded-full bg-(--old-blue) ${animated ? 'animate-pulse' : ''}`} />
			</span>
		)
	}
	if (status === 'cancelled') {
		return (
			<span
				aria-hidden="true"
				className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-sm border border-[#d1d5db] text-[10px] text-[#9ca3af] line-through dark:border-[#3f3f46]"
			>
				✕
			</span>
		)
	}
	return (
		<span
			aria-hidden="true"
			className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-sm border border-[#d1d5db] dark:border-[#3f3f46]"
		/>
	)
}

export function TodoChecklistPanel({
	todos,
	startTime,
	isLive = false,
	interrupted = false
}: {
	todos: TodoItem[]
	startTime?: number
	isLive?: boolean
	interrupted?: boolean
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
	// Per-item status is only trustworthy while the run is live, or when it ended
	// early — then the incompleteness is real. On a clean finish the last todo
	// state is stale (the model stops updating it), so the plan renders as plain
	// context with no status claims that could contradict the answer.
	const showStatus = isLive || interrupted
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
				{interrupted ? (
					<p className="m-0 shrink-0 rounded bg-[rgba(244,63,94,0.1)] px-1.5 py-0.5 text-[10px] text-[#e11d48] sm:text-xs dark:text-[#fb7185]">
						ended early
					</p>
				) : null}
				{showStatus ? (
					<p className="m-0 shrink-0 rounded bg-[rgba(0,0,0,0.04)] px-1.5 py-0.5 text-[10px] text-[#666] sm:text-xs dark:bg-[rgba(145,146,150,0.12)] dark:text-[#919296]">
						{completed}/{total} done
					</p>
				) : null}
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
								{showStatus ? (
									<TodoStatusIcon status={todo.status} animated={isLive} />
								) : (
									<span
										aria-hidden="true"
										className="inline-flex size-3.5 shrink-0 items-center justify-center text-[#9ca3af] dark:text-[#6b7280]"
									>
										•
									</span>
								)}
							</span>
							<p
								className={`m-0 flex-1 text-xs leading-[1.45] sm:text-sm ${
									!showStatus
										? 'text-[#666] dark:text-[#919296]'
										: isActive
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
	toolExecutions: Array<{ name?: string; success?: boolean; error?: string; toolData?: unknown }> | undefined
): TodoItem[] {
	if (!toolExecutions || toolExecutions.length === 0) return []
	for (let i = toolExecutions.length - 1; i >= 0; i--) {
		const exec = toolExecutions[i]
		if (exec?.name !== 'todo') continue
		if (exec.success !== true || exec.error) continue
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
