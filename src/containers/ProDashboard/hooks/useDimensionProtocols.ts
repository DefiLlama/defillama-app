import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'
import type { DimensionProtocols } from '../templates'

export function useDimensionProtocols() {
	const { data: perpsData, isLoading: perpsLoading } = useQuery({
		queryKey: ['dimension-protocols', 'perps'],
		queryFn: () => fetchJson('/api/datasets/perps'),
		staleTime: 5 * 60 * 1000
	})

	const { data: dexsData, isLoading: dexsLoading } = useQuery({
		queryKey: ['dimension-protocols', 'dexs'],
		queryFn: () => fetchJson('/api/datasets/dexs'),
		staleTime: 5 * 60 * 1000
	})

	const { data: aggregatorsData, isLoading: aggregatorsLoading } = useQuery({
		queryKey: ['dimension-protocols', 'aggregators'],
		queryFn: () => fetchJson('/api/datasets/aggregators'),
		staleTime: 5 * 60 * 1000
	})

	const dimensionProtocols = useMemo<DimensionProtocols>(() => {
		return {
			perps: perpsData || [],
			dexs: dexsData || [],
			dexAggregators: aggregatorsData || []
		}
	}, [perpsData, dexsData, aggregatorsData])

	const isLoading = perpsLoading || dexsLoading || aggregatorsLoading

	return { dimensionProtocols, isLoading }
}
