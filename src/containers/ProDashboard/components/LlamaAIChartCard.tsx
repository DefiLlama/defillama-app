import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { MCP_SERVER } from '~/constants'
import { ChartRenderer } from '~/containers/LlamaAI/components/charts/ChartRenderer'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import type { LlamaAIChartConfig } from '../types'
import { LoadingSpinner } from './LoadingSpinner'

interface LlamaAIChartCardProps {
	config: LlamaAIChartConfig
}

export default function LlamaAIChartCard({ config }: LlamaAIChartCardProps) {
	const { authorizedFetch } = useAuthContext()
	const queryClient = useQueryClient()
	const [isRefreshing, setIsRefreshing] = useState(false)

	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ['pro-dashboard', 'saved-chart', config.savedChartId],
		queryFn: async () => {
			const res = await authorizedFetch(`${MCP_SERVER}/charts/${config.savedChartId}`)
			if (!res?.ok) throw new Error('Failed to load chart')
			return res.json()
		},
		staleTime: 1000 * 60 * 60,
		refetchOnMount: 'always'
	})

	const handleOwnerRefresh = async () => {
		setIsRefreshing(true)
		try {
			const res = await authorizedFetch(`${MCP_SERVER}/charts/${config.savedChartId}?refresh=true`)
			if (res?.ok) {
				const freshData = await res.json()
				queryClient.setQueryData(['pro-dashboard', 'saved-chart', config.savedChartId], freshData)
			}
		} finally {
			setIsRefreshing(false)
		}
	}

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
				<button
					className="text-sm text-(--link-text) hover:underline"
					onClick={() => {
						void refetch()
					}}
				>
					Try again
				</button>
			</div>
		)
	}

	if (!data) {
		return <p className="flex min-h-[300px] items-center justify-center text-(--text-form)">Chart not found</p>
	}

	const isStale = !data.dataFreshness?.isFresh
	const isOwner = data.isOwner
	const isPremium = data.isPremium

	return (
		<div className="flex flex-col gap-2 p-2">
			<div className="flex items-center justify-between">
				<h3 className="font-medium">{config.title || data.title}</h3>
				{isStale && data.dataFreshness?.cachedAt ? (
					<div className="flex items-center gap-2">
						<span className="text-xs text-(--text-form)">
							Updated {new Date(data.dataFreshness.cachedAt).toLocaleDateString()}
						</span>
						{isOwner && isPremium ? (
							<button
								className="text-xs text-(--link-text) hover:underline disabled:opacity-50"
								onClick={handleOwnerRefresh}
								disabled={isRefreshing}
							>
								{isRefreshing ? 'Refreshing...' : 'Refresh'}
							</button>
						) : isPremium ? (
							<span className="text-xs text-[#F2994A]">Stale</span>
						) : null}
					</div>
				) : null}
			</div>
			<ChartRenderer charts={[data.chartConfig]} chartData={data.chartData} />
		</div>
	)
}
