import type { ReactNode } from 'react'

type ToolDataRenderer = (data: Record<string, unknown>) => ReactNode | null

const asRecord = (value: unknown): Record<string, unknown> | null =>
	value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

const isRecord = (value: Record<string, unknown> | null): value is Record<string, unknown> => value !== null

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

const asString = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback)

const asNumber = (value: unknown, fallback = 0): number =>
	typeof value === 'number' && Number.isFinite(value) ? value : fallback

const TOOL_DATA_RENDERERS: Record<string, ToolDataRenderer> = {
	resolve_entity: (data) => {
		const results = asRecord(data.results) || (data.topMatch ? { _single: data } : null)
		if (!results) return null
		return (
			<div className="mt-1 mb-1 flex flex-col gap-0.5 rounded border border-[#e6e6e6] bg-[#fafafa] p-1.5 dark:border-[#333] dark:bg-[#1a1a1a]">
				{Object.entries(results).map(([term, value]) => {
					const result = asRecord(value)
					const topMatch = asRecord(result?.topMatch)
					const matchCount = asNumber(result?.matchCount, 0)
					return (
						<div key={term} className="flex items-center gap-2 text-[10px]">
							{term !== '_single' ? <span className="font-medium text-[#666] dark:text-[#999]">{term}:</span> : null}
							{topMatch ? (
								<span className="text-[#444] dark:text-[#bbb]">
									{asString(topMatch.slug, 'unknown')}{' '}
									<span className="text-[#999]">
										({asString(topMatch.type, 'unknown')}, {Math.round(asNumber(topMatch.confidence) * 100)}%)
									</span>
									{matchCount > 1 ? <span className="text-[#999]"> +{matchCount - 1} more</span> : null}
								</span>
							) : (
								<span className="text-[#999]">no match</span>
							)}
						</div>
					)
				})}
			</div>
		)
	},
	generate_chart: (data) => {
		const charts = asArray(data.charts).map(asRecord).filter(isRecord)
		if (charts.length === 0) return null
		return (
			<div className="mt-1 mb-1 flex flex-col gap-0.5 rounded border border-[#e6e6e6] bg-[#fafafa] p-1.5 dark:border-[#333] dark:bg-[#1a1a1a]">
				{charts.map((chart, index) => (
					<div key={asString(chart.id, `chart-${index}`)} className="text-[10px] text-[#444] dark:text-[#bbb]">
						<span className="font-medium">{asString(chart.title, 'Chart')}</span>{' '}
						<span className="text-[#999]">
							({asString(chart.type, 'unknown')}, {asNumber(chart.seriesCount)} series)
						</span>
					</div>
				))}
			</div>
		)
	},
	execute_code: (data) =>
		asArray(data.logs).length ? (
			<pre className="mt-1 mb-1 overflow-x-auto rounded border border-[#e6e6e6] bg-[#fafafa] p-1.5 font-mono text-[10px] text-[#444] dark:border-[#333] dark:bg-[#1a1a1a] dark:text-[#bbb]">
				{asArray(data.logs).join('\n')}
			</pre>
		) : null,
	load_skill: (data) => {
		const unlockedTools = asArray(data.unlockedTools)
		return (
			<div className="mt-1 mb-1 text-[10px] text-[#444] dark:text-[#bbb]">
				<span className="font-medium">{asString(data.skill, 'Skill')}</span>
				{unlockedTools.length > 0 ? <span className="text-[#999]"> - unlocked: {unlockedTools.join(', ')}</span> : null}
			</div>
		)
	},
	spawn_agent: (data) => {
		const agents = asArray(data.agents).map(asRecord).filter(isRecord)
		if (agents.length === 0) return null
		return (
			<div className="mt-1 mb-1 flex flex-col gap-0.5 rounded border border-[#e6e6e6] bg-[#fafafa] p-1.5 dark:border-[#333] dark:bg-[#1a1a1a]">
				{agents.map((agent, index) => {
					const agentId = asString(agent.id, `agent-${index}`)
					const chartCount = asNumber(agent.chartCount)
					return (
						<div key={agentId} className="text-[10px] text-[#444] dark:text-[#bbb]">
							Agent {agentId.slice(0, 6)}{' '}
							<span className="text-[#999]">
								({asNumber(agent.toolCalls)} tool calls{chartCount > 0 ? `, ${chartCount} charts` : ''})
							</span>
						</div>
					)
				})}
			</div>
		)
	},
	web_search: (data) => (
		<span className="mt-1 mb-1 text-[10px] text-[#999]">{asNumber(data.citationCount)} sources</span>
	),
	x_search: (data) => <span className="mt-1 mb-1 text-[10px] text-[#999]">{asNumber(data.tweetCount)} tweets</span>
}

export function ToolDataView({ name, data }: { name: string; data: Record<string, unknown> }) {
	return TOOL_DATA_RENDERERS[name]?.(data) ?? null
}
