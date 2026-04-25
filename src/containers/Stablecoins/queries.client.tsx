import { useQuery } from '@tanstack/react-query'
import type { MultiSeriesChart2Dataset, MultiSeriesChart2SeriesConfig } from '~/components/ECharts/types'
import type { StablecoinVolumeChartKind } from '~/containers/Stablecoins/api.types'
import { STABLECOIN_CHART_STALE_TIME } from '~/containers/Stablecoins/chartSeries'
import type {
	StablecoinAssetChartType,
	StablecoinChainsChartType,
	StablecoinChartSeriesPayload,
	StablecoinOverviewChartType
} from '~/containers/Stablecoins/chartSeries'
import { fetchJson } from '~/utils/async'

type StablecoinMcapSeriesPoint = [number, number]

export interface StablecoinVolumeChartPayload {
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesChart2SeriesConfig[]
	valueSymbol: '$'
	stacked: boolean
	showTotalInTooltip: boolean
}

const buildStablecoinMcapSeries = async (chain: string): Promise<StablecoinMcapSeriesPoint[] | null> => {
	try {
		return fetchJson<StablecoinMcapSeriesPoint[]>(`/api/stablecoins/chart?chain=${encodeURIComponent(chain)}`)
	} catch (err) {
		console.log(err)
		return null
	}
}
export const useGetStabelcoinsChartDataByChain = (chain?: string) => {
	const { data, isLoading, error } = useQuery({
		queryKey: ['stablecoins', 'chart-by-chain', chain],
		queryFn: chain ? () => buildStablecoinMcapSeries(chain) : () => null,
		staleTime: STABLECOIN_CHART_STALE_TIME,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: !!chain
	})

	return { data: data ?? null, error, isLoading }
}

type StablecoinChartSeriesQuery =
	| {
			scope: 'overview'
			chain: string
			chart: StablecoinOverviewChartType | null
			filters?: Record<string, string | string[] | undefined>
			enabled?: boolean
	  }
	| {
			scope: 'chains'
			chart: StablecoinChainsChartType | null
			includeUnreleased?: boolean
			enabled?: boolean
	  }
	| {
			scope: 'asset'
			stablecoin: string
			chart: StablecoinAssetChartType | null
			includeUnreleased?: boolean
			enabled?: boolean
	  }

export const buildStablecoinChartSeriesUrl = (query: StablecoinChartSeriesQuery): string | null => {
	if (!query.chart) return null
	const params = new URLSearchParams({ scope: query.scope, chart: query.chart })
	if (query.scope === 'overview') {
		params.set('chain', query.chain)
		const filters = query.filters ?? {}
		for (const key in filters) {
			const value = filters[key]
			if (typeof value === 'undefined') continue
			if (Array.isArray(value)) {
				for (const item of value) {
					params.append(key, item)
				}
			} else {
				params.set(key, value)
			}
		}
	} else if (query.scope === 'chains') {
		if (query.includeUnreleased) params.set('unreleased', 'true')
	} else if (query.scope === 'asset') {
		params.set('stablecoin', query.stablecoin)
		if (query.includeUnreleased) params.set('unreleased', 'true')
	}
	return `/api/stablecoins/chart-series?${params.toString()}`
}

export const useStablecoinChartSeriesData = (query: StablecoinChartSeriesQuery) => {
	const { enabled = true, ...queryKey } = query
	return useQuery({
		queryKey: ['stablecoins', 'chart-series', queryKey],
		queryFn: () => {
			const url = buildStablecoinChartSeriesUrl(query)
			if (!url) return null
			return fetchJson<StablecoinChartSeriesPayload>(url)
		},
		staleTime: STABLECOIN_CHART_STALE_TIME,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: enabled && !!query.chart
	})
}

export const useStablecoinVolumeChartData = ({
	chart,
	dimension,
	fallbackDimension,
	limit = 20,
	enabled = true
}: {
	chart: StablecoinVolumeChartKind | null
	dimension?: string
	fallbackDimension?: string
	limit?: number
	enabled?: boolean
}) => {
	return useQuery({
		queryKey: ['stablecoins', 'volume-chart', chart, dimension ?? null, fallbackDimension ?? null, limit],
		queryFn: () => {
			if (!chart) return null
			const params = new URLSearchParams({ chart, limit: String(limit) })
			if (dimension) params.set('dimension', dimension)
			if (fallbackDimension) params.set('fallbackDimension', fallbackDimension)
			return fetchJson<StablecoinVolumeChartPayload>(`/api/stablecoins/volume-chart?${params.toString()}`)
		},
		staleTime: STABLECOIN_CHART_STALE_TIME,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: enabled && !!chart
	})
}
