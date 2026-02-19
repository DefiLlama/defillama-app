import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'
import type { DimensionProtocols } from '../templates'

const EMPTY_PROTOCOLS: NonNullable<DimensionProtocols['perps']> = []

export function useDimensionProtocols() {
	const { data: perpsData, isLoading: perpsLoading } = useQuery({
		queryKey: ['dimension-protocols', 'perps'],
		queryFn: () => fetchJson('/api/datasets/perps'),
		staleTime: Infinity,
		retry: 1
	})

	const { data: dexsData, isLoading: dexsLoading } = useQuery({
		queryKey: ['dimension-protocols', 'dexs'],
		queryFn: () => fetchJson('/api/datasets/dexs'),
		staleTime: Infinity,
		retry: 1
	})

	const { data: aggregatorsData, isLoading: aggregatorsLoading } = useQuery({
		queryKey: ['dimension-protocols', 'aggregators'],
		queryFn: () => fetchJson('/api/datasets/aggregators'),
		staleTime: Infinity,
		retry: 1
	})

	const dimensionProtocols: DimensionProtocols = {
		perps: perpsData ?? EMPTY_PROTOCOLS,
		dexs: dexsData ?? EMPTY_PROTOCOLS,
		dexAggregators: aggregatorsData ?? EMPTY_PROTOCOLS
	}

	const isLoading = perpsLoading || dexsLoading || aggregatorsLoading

	return { dimensionProtocols, isLoading }
}
