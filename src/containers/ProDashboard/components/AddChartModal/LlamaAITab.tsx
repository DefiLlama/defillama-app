import { memo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '~/components/Icon'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'

interface SavedChart {
	id: string
	title: string
	description?: string
	original_query: string
	session_id?: string
	chart_type?: string
	created_at: string
	access_count: number
}

interface LlamaAITabProps {
	selectedChart: { id: string; title: string } | null
	onChartSelect: (chart: SavedChart | null) => void
}

export const LlamaAITab = memo(function LlamaAITab({ selectedChart, onChartSelect }: LlamaAITabProps) {
	const { authorizedFetch, user } = useAuthContext()
	const [searchQuery, setSearchQuery] = useState('')

	const { data, isLoading, error } = useQuery({
		queryKey: ['saved-charts-list', user?.id],
		queryFn: async () => {
			const res = await authorizedFetch(`${MCP_SERVER}/charts`)
			if (!res.ok) throw new Error('Failed to load charts')
			const json = await res.json()
			return json.charts as SavedChart[]
		},
		enabled: !!user,
		staleTime: 1000 * 60 * 5
	})

	if (!user) {
		return (
			<div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
				<p className="pro-text2 text-sm">Sign in to access your saved LlamaAI charts</p>
			</div>
		)
	}

	if (isLoading) {
		return (
			<div className="flex min-h-[300px] items-center justify-center">
				<div className="h-6 w-6 animate-spin rounded-full border-2 border-(--primary) border-t-transparent" />
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex min-h-[300px] flex-col items-center justify-center gap-2">
				<Icon name="alert-triangle" height={24} width={24} className="text-[#F2994A]" />
				<p className="pro-text2 text-sm">Failed to load saved charts</p>
			</div>
		)
	}

	const filteredCharts = data?.filter((chart) => {
		if (!searchQuery) return true
		const query = searchQuery.toLowerCase()
		return (
			chart.title?.toLowerCase().includes(query) ||
			chart.original_query?.toLowerCase().includes(query) ||
			chart.description?.toLowerCase().includes(query)
		)
	})

	if (!data?.length) {
		return (
			<div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
				<div>
					<p className="pro-text1 font-medium">No saved charts yet</p>
					<p className="pro-text3 mt-1 text-sm">Save charts from LlamaAI to add them to your dashboard</p>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div>
				<input
					type="text"
					placeholder="Search saved charts..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="pro-text1 placeholder:pro-text3 w-full rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-2 text-sm focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
				/>
			</div>

			<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
				{filteredCharts?.map((chart) => (
					<button
						key={chart.id}
						onClick={() => onChartSelect(selectedChart?.id === chart.id ? null : chart)}
						className={`flex flex-col gap-2 rounded-lg border p-3 text-left transition-all ${
							selectedChart?.id === chart.id
								? 'border-(--primary) bg-(--primary)/5'
								: 'pro-border hover:border-(--primary)/50'
						}`}
					>
						<div className="flex items-start justify-between gap-2">
							<h4 className="pro-text1 line-clamp-1 font-medium">{chart.title}</h4>
							{selectedChart?.id === chart.id && (
								<Icon name="check" height={16} width={16} className="shrink-0 text-(--primary)" />
							)}
						</div>
						<p className="pro-text3 line-clamp-2 text-xs">{chart.original_query}</p>
						{chart.session_id && (
							<a
								href={`/ai/chat/${chart.session_id}`}
								target="_blank"
								rel="noopener noreferrer"
								onClick={(e) => e.stopPropagation()}
								className="pro-text3 text-xs text-(--primary) hover:underline"
							>
								View chat →
							</a>
						)}
					</button>
				))}
			</div>

			{filteredCharts?.length === 0 && searchQuery && (
				<p className="pro-text3 py-8 text-center text-sm">No charts match your search</p>
			)}
		</div>
	)
})
