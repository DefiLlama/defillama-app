import { memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '~/components/Icon'
import { MCP_SERVER } from '~/constants'
import { ChartRenderer } from '~/containers/LlamaAI/components/ChartRenderer'
import { LlamaAIChartConfig } from '../types'
import { LoadingSpinner } from './LoadingSpinner'

interface LlamaAIChartCardProps {
	config: LlamaAIChartConfig
}

export default memo(function LlamaAIChartCard({ config }: LlamaAIChartCardProps) {
	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ['saved-chart', config.savedChartId],
		queryFn: async () => {
			const res = await fetch(`${MCP_SERVER}/charts/${config.savedChartId}`)
			if (!res.ok) throw new Error('Failed to load chart')
			return res.json()
		},
		staleTime: 1000 * 60 * 60,
		refetchOnMount: 'always'
	})

	if (isLoading) {
		return (
			<div className="flex min-h-[300px] items-center justify-center">
				<LoadingSpinner />
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex min-h-[300px] flex-col items-center justify-center gap-2">
				<Icon name="alert-triangle" height={24} width={24} className="text-[#F2994A]" />
				<p className="text-(--text-form)">Failed to load chart</p>
				<button className="text-sm text-(--link-text) hover:underline" onClick={() => refetch()}>
					Try again
				</button>
			</div>
		)
	}

	if (!data) {
		return <div className="flex min-h-[300px] items-center justify-center text-(--text-form)">Chart not found</div>
	}

	return (
		<div className="flex flex-col gap-2 p-2">
			<div className="flex items-center justify-between">
				<h3 className="font-medium">{data.title}</h3>
				{!data.dataFreshness?.isFresh && data.dataFreshness?.cachedAt && (
					<span className="text-xs text-(--text-form)">
						Updated {new Date(data.dataFreshness.cachedAt).toLocaleDateString()}
					</span>
				)}
			</div>
			<ChartRenderer charts={[data.chartConfig]} chartData={data.chartData} />
		</div>
	)
})
