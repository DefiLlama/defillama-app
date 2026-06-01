import type { ReactNode } from 'react'

type ToolDataRenderer = (data: Record<string, any>) => ReactNode | null

const TOOL_DATA_RENDERERS: Record<string, ToolDataRenderer> = {
	resolve_entity: (data) => {
		const results = data.results || (data.topMatch ? { _single: data } : null)
		if (!results) return null
		return (
			<div className="mt-1 mb-1 flex flex-col gap-0.5 rounded border border-[#e6e6e6] bg-[#fafafa] p-1.5 dark:border-[#333] dark:bg-[#1a1a1a]">
				{Object.entries(results).map(([term, value]: [string, any]) => (
					<div key={term} className="flex items-center gap-2 text-[10px]">
						{term !== '_single' ? <span className="font-medium text-[#666] dark:text-[#999]">{term}:</span> : null}
						{value.topMatch ? (
							<span className="text-[#444] dark:text-[#bbb]">
								{value.topMatch.slug}{' '}
								<span className="text-[#999]">
									({value.topMatch.type}, {Math.round(value.topMatch.confidence * 100)}%)
								</span>
								{value.matchCount > 1 ? <span className="text-[#999]"> +{value.matchCount - 1} more</span> : null}
							</span>
						) : (
							<span className="text-[#999]">no match</span>
						)}
					</div>
				))}
			</div>
		)
	},
	generate_chart: (data) => {
		if (!data.charts) return null
		return (
			<div className="mt-1 mb-1 flex flex-col gap-0.5 rounded border border-[#e6e6e6] bg-[#fafafa] p-1.5 dark:border-[#333] dark:bg-[#1a1a1a]">
				{data.charts.map((chart: any) => (
					<div key={chart.id} className="text-[10px] text-[#444] dark:text-[#bbb]">
						<span className="font-medium">{chart.title}</span>{' '}
						<span className="text-[#999]">
							({chart.type}, {chart.seriesCount} series)
						</span>
					</div>
				))}
			</div>
		)
	},
	execute_code: (data) =>
		data.logs?.length ? (
			<pre className="mt-1 mb-1 overflow-x-auto rounded border border-[#e6e6e6] bg-[#fafafa] p-1.5 font-mono text-[10px] text-[#444] dark:border-[#333] dark:bg-[#1a1a1a] dark:text-[#bbb]">
				{data.logs.join('\n')}
			</pre>
		) : null,
	load_skill: (data) => (
		<div className="mt-1 mb-1 text-[10px] text-[#444] dark:text-[#bbb]">
			<span className="font-medium">{data.skill}</span>
			{data.unlockedTools?.length > 0 ? (
				<span className="text-[#999]"> - unlocked: {data.unlockedTools.join(', ')}</span>
			) : null}
		</div>
	),
	spawn_agent: (data) => {
		if (!data.agents) return null
		return (
			<div className="mt-1 mb-1 flex flex-col gap-0.5 rounded border border-[#e6e6e6] bg-[#fafafa] p-1.5 dark:border-[#333] dark:bg-[#1a1a1a]">
				{data.agents.map((agent: any) => (
					<div key={agent.id} className="text-[10px] text-[#444] dark:text-[#bbb]">
						Agent {agent.id.slice(0, 6)}{' '}
						<span className="text-[#999]">
							({agent.toolCalls} tool calls{agent.chartCount > 0 ? `, ${agent.chartCount} charts` : ''})
						</span>
					</div>
				))}
			</div>
		)
	},
	web_search: (data) => <span className="mt-1 mb-1 text-[10px] text-[#999]">{data.citationCount} sources</span>,
	x_search: (data) => <span className="mt-1 mb-1 text-[10px] text-[#999]">{data.tweetCount} tweets</span>
}

export function ToolDataView({ name, data }: { name: string; data: Record<string, any> }) {
	return TOOL_DATA_RENDERERS[name]?.(data) ?? null
}
