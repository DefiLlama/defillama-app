import { useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { ToolDataView } from '~/containers/LlamaAI/components/messages/ToolDataView'
import { getToolLabel, TOOL_ICONS } from '~/containers/LlamaAI/toolMetadata'
import type { ToolExecution } from '~/containers/LlamaAI/types'

function createOccurrenceKeyFactory() {
	const counts = new Map<string, number>()
	return (baseKey: string) => {
		const nextCount = counts.get(baseKey) || 0
		counts.set(baseKey, nextCount + 1)
		return nextCount === 0 ? baseKey : `${baseKey}-${nextCount}`
	}
}

function getToolExecutionKey(execution: ToolExecution) {
	return (
		execution.resultId ||
		`${execution.name}:${execution.executionTimeMs}:${execution.sqlQuery || ''}:${execution.error || ''}`
	)
}

const formatStepDuration = (ms: number): string => {
	if (ms < 1000) return `${ms}ms`
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
	const m = Math.floor(ms / 60000)
	const s = Math.floor((ms % 60000) / 1000)
	return `${m}m ${s}s`
}

const formatStepCost = (usd: number): string => (usd < 0.01 ? `$${usd.toFixed(3)}` : `$${usd.toFixed(2)}`)

export function ToolExecutionPanel({
	toolExecutions,
	showDetails = false
}: {
	toolExecutions: ToolExecution[]
	showDetails?: boolean
}) {
	const totalTime = toolExecutions.reduce((sum, execution) => sum + execution.executionTimeMs, 0)
	const successCount = toolExecutions.filter((execution) => execution.success).length
	const failedCount = toolExecutions.length - successCount
	const totalCost = toolExecutions.reduce((sum, execution) => {
		const cost = execution.costUsd ? parseFloat(execution.costUsd) : NaN
		return Number.isFinite(cost) ? sum + cost : sum
	}, 0)
	const detailsRef = useRef<HTMLDetailsElement>(null)
	const contentRef = useRef<HTMLDivElement>(null)
	const getRowKey = createOccurrenceKeyFactory()

	return (
		<details
			ref={detailsRef}
			className="group rounded-lg border border-[#e6e6e6] bg-(--cards-bg) dark:border-[#222324]"
			onToggle={() => {
				if (!detailsRef.current?.open) return
				requestAnimationFrame(() => {
					contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
				})
			}}
		>
			<summary className="flex w-full items-center gap-2 px-3 py-2 text-left">
				<svg
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					className="shrink-0 text-[#999] transition-transform group-open:rotate-90 dark:text-[#666]"
				>
					<path d="M9 18l6-6-6-6" />
				</svg>
				<span className="flex-1 text-xs text-[#666] dark:text-[#919296]">
					{toolExecutions.length} step{toolExecutions.length !== 1 ? 's' : ''}
				</span>
				{failedCount > 0 ? (
					<span className="text-[10px] text-amber-600 dark:text-amber-400">{failedCount} failed</span>
				) : null}
				<span className="font-mono text-[10px] text-[#999] tabular-nums dark:text-[#666]">
					{formatStepDuration(totalTime)}
				</span>
				{totalCost > 0 ? (
					<span className="font-mono text-[10px] text-amber-600 tabular-nums dark:text-amber-400">
						{formatStepCost(totalCost)}
					</span>
				) : null}
			</summary>
			<div
				ref={contentRef}
				className="flex flex-col gap-1 border-t border-[#e6e6e6] px-3 py-2 select-text dark:border-[#222324]"
			>
				{toolExecutions.map((execution) => (
					<ToolExecutionRow
						key={getRowKey(getToolExecutionKey(execution))}
						execution={execution}
						showDetails={showDetails}
					/>
				))}
			</div>
		</details>
	)
}

function ToolExecutionRow({ execution, showDetails = false }: { execution: ToolExecution; showDetails?: boolean }) {
	const [showPreview, setShowPreview] = useState(false)
	const meta = TOOL_ICONS[execution.name] || { icon: 'sparkles', color: '#919296' }
	const label = getToolLabel(execution.name)
	const hasDetails = showDetails && (execution.resultPreview?.length || execution.sqlQuery || execution.toolData)
	const parsedCost = execution.costUsd ? parseFloat(execution.costUsd) : NaN
	const premiumCostLabel = Number.isFinite(parsedCost) ? ` ${formatStepCost(parsedCost)}` : ''

	return (
		<div className="flex flex-col">
			<button
				type="button"
				onClick={() => hasDetails && setShowPreview(!showPreview)}
				className="flex items-center gap-2 py-0.5 text-left"
			>
				<Icon name={meta.icon as never} height={12} width={12} className="shrink-0" style={{ color: meta.color }} />
				<span className="flex-1 text-xs text-[#555] dark:text-[#ccc]">{label}</span>
				{execution.isPremium || execution.costUsd ? (
					<span className="rounded-full bg-amber-100 px-1.5 py-px text-[9px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
						Premium{premiumCostLabel}
					</span>
				) : null}
				<span
					aria-label={execution.success ? 'succeeded' : 'failed'}
					className={`h-1.5 w-1.5 shrink-0 rounded-full ${execution.success ? 'bg-green-500 dark:bg-green-400' : 'bg-red-500'}`}
				/>
				<span className="font-mono text-[10px] text-[#999] tabular-nums dark:text-[#666]">
					{formatStepDuration(execution.executionTimeMs)}
				</span>
				{showDetails && execution.resultCount != null ? (
					<span className="text-[10px] text-[#999] dark:text-[#666]">{execution.resultCount} results</span>
				) : null}
			</button>
			{showPreview && execution.sqlQuery ? (
				<pre className="mt-1 mb-1 overflow-x-auto rounded border border-[#e6e6e6] bg-[#fafafa] p-1.5 font-mono text-[10px] text-[#444] dark:border-[#333] dark:bg-[#1a1a1a] dark:text-[#bbb]">
					{execution.sqlQuery}
				</pre>
			) : null}
			{showPreview && execution.resultPreview && execution.resultPreview.length > 0 ? (
				<div className="mt-1 mb-1 overflow-x-auto rounded border border-[#e6e6e6] bg-[#fafafa] p-1 dark:border-[#333] dark:bg-[#1a1a1a]">
					<table className="text-[10px]">
						<thead>
							<tr>
								{Object.keys(execution.resultPreview[0]).map((column) => (
									<th key={column} className="px-1.5 py-0.5 text-left font-medium text-[#666] dark:text-[#999]">
										{column}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{execution.resultPreview.map((row, rowIndex) => (
								<tr key={rowIndex}>
									{Object.values(row).map((value, columnIndex) => (
										<td key={columnIndex} className="px-1.5 py-0.5 text-[#444] dark:text-[#bbb]">
											{String(value ?? '')}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : null}
			{showPreview && execution.toolData ? <ToolDataView name={execution.name} data={execution.toolData} /> : null}
			{!execution.success && execution.error ? (
				<p className="mt-0.5 ml-5 text-[10px] text-red-500/80 dark:text-red-400/80">{execution.error}</p>
			) : null}
		</div>
	)
}
