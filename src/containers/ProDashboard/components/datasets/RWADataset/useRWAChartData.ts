import { useQuery } from '@tanstack/react-query'
import { useContext, useMemo } from 'react'
import { ProxyAuthTokenContext, StreamDoneContext } from '~/containers/ProDashboard/queries'
import {
	fetchRWABreakdownViaProxy,
	fetchRWAAssetChartViaProxy,
	fetchRWAAssetsListViaProxy
} from '~/containers/ProDashboard/services/fetchViaProxy'
import {
	fetchRWAActiveTVLs,
	fetchRWAAssetChartData,
	fetchRWAChainBreakdownChartData,
	fetchRWACategoryBreakdownChartData,
	fetchRWAPlatformBreakdownChartData,
	fetchRWAAssetGroupBreakdownChartData,
	fetchRWAChartDataByAsset,
	toUnixMsTimestamp
} from '~/containers/RWA/api'
import type { IFetchedRWAProject } from '~/containers/RWA/api.types'
import { toBreakdownChartDataset } from '~/containers/RWA/breakdownDataset'
import type { RWAOverviewChartBreakdown, RWAOverviewChartMetric } from '../../../types'

const STALE_TIME = 60 * 60 * 1000

function normalizeTimestamps(rows: any[] | null): any[] | null {
	if (!rows) return null
	return rows.map((row) => ({
		...row,
		timestamp: toUnixMsTimestamp(Number(row.timestamp))
	}))
}

function getBreakdownFetcher(breakdown: RWAOverviewChartBreakdown) {
	switch (breakdown) {
		case 'chain':
			return fetchRWAChainBreakdownChartData
		case 'category':
			return fetchRWACategoryBreakdownChartData
		case 'platform':
			return fetchRWAPlatformBreakdownChartData
		case 'assetGroup':
			return fetchRWAAssetGroupBreakdownChartData
		default:
			return fetchRWAChainBreakdownChartData
	}
}

function getBreakdownParam(breakdown: RWAOverviewChartBreakdown): RWAOverviewChartBreakdown {
	if (breakdown === 'assetClass' || breakdown === 'assetName') {
		return 'chain'
	}
	return breakdown
}

export function useRWABreakdownChartData(
	breakdown: RWAOverviewChartBreakdown,
	metric: RWAOverviewChartMetric,
	chain?: string
) {
	const streamDone = useContext(StreamDoneContext)
	const authToken = useContext(ProxyAuthTokenContext)
	const actualBreakdown = getBreakdownParam(breakdown)
	const isChainSpecific = chain && chain !== 'All'

	const { data, isLoading, error } = useQuery({
		queryKey: ['pro-dashboard', 'rwa-breakdown-chart', actualBreakdown, metric, chain || 'All'],
		enabled: streamDone,
		queryFn: async () => {
			if (isChainSpecific) {
				if (authToken) {
					const proxyData = await fetchRWABreakdownViaProxy(actualBreakdown, metric, authToken, chain)
					return normalizeTimestamps(proxyData)
				}
				const assetData = await fetchRWAChartDataByAsset({
					target: { kind: 'chain', slug: chain },
					includeStablecoins: false,
					includeGovernance: false
				})
				if (!assetData) return null
				return normalizeTimestamps(assetData[metric] ?? null)
			}

			if (authToken) {
				return fetchRWABreakdownViaProxy(actualBreakdown, metric, authToken)
			}
			const fetcher = getBreakdownFetcher(actualBreakdown)
			return fetcher({
				key: metric,
				includeStablecoin: false,
				includeGovernance: false
			})
		},
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false,
		retry: 1
	})

	const chartDataset = useMemo(() => {
		if (!data) return null
		return toBreakdownChartDataset(data)
	}, [data])

	return { chartDataset, isLoading, error }
}

export function useRWAChainsList() {
	const streamDone = useContext(StreamDoneContext)
	const authToken = useContext(ProxyAuthTokenContext)

	const { data, isLoading } = useQuery({
		queryKey: ['pro-dashboard', 'rwa-chains-list'],
		enabled: streamDone,
		queryFn: async () => {
			if (authToken) {
				return fetchRWABreakdownViaProxy('chain', 'activeMcap', authToken)
			}
			return fetchRWAChainBreakdownChartData({
				key: 'activeMcap',
				includeStablecoin: false,
				includeGovernance: false
			})
		},
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false,
		retry: 1
	})

	const chains = useMemo(() => {
		if (!data || !Array.isArray(data) || data.length === 0) return []
		const lastRow = data[data.length - 1] as Record<string, number>
		return Object.entries(lastRow)
			.filter(([k, v]) => k !== 'timestamp' && Number.isFinite(v) && v > 0)
			.sort((a, b) => b[1] - a[1])
			.map(([chain, tvl]) => ({ chain, tvl }))
	}, [data])

	return { chains, isLoading }
}

export function useRWAAssetChartData(assetId: string | null) {
	const streamDone = useContext(StreamDoneContext)
	const authToken = useContext(ProxyAuthTokenContext)

	const { data, isLoading, error } = useQuery({
		queryKey: ['pro-dashboard', 'rwa-asset-chart', assetId],
		enabled: streamDone && !!assetId,
		queryFn: async () => {
			if (authToken) {
				return fetchRWAAssetChartViaProxy(assetId!, authToken)
			}
			return fetchRWAAssetChartData(assetId!)
		},
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false,
		retry: 1
	})

	return { chartDataset: data ?? null, isLoading, error }
}

import { tokenIconUrl } from '~/utils/icons'

export type RWAAssetOption = {
	id: string
	ticker: string
	assetName: string | null
	iconUrl: string | null
	totalActiveMcap: number
}

function getTotalFromMap(map: Record<string, number> | null | undefined): number {
	if (!map) return 0
	let total = 0
	for (const v of Object.values(map)) {
		if (Number.isFinite(v)) total += v
	}
	return total
}

function resolveIconUrl(asset: IFetchedRWAProject): string | null {
	if (asset.coingeckoId) return tokenIconUrl(asset.coingeckoId)
	const logo = asset.logo
	if (!logo || !logo.startsWith('http')) return null
	return logo
}

export function useRWAAssetsList() {
	const authToken = useContext(ProxyAuthTokenContext)

	const { data, isLoading } = useQuery({
		queryKey: ['pro-dashboard', 'rwa-assets-list'],
		queryFn: async () => {
			if (authToken) {
				return fetchRWAAssetsListViaProxy(authToken)
			}
			return fetchRWAActiveTVLs()
		},
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false,
		retry: 1
	})

	const assets: RWAAssetOption[] = useMemo(() => {
		if (!data) return []
		return data
			.filter((a: IFetchedRWAProject) => a.id && a.ticker && !a.stablecoin && !a.governance)
			.map((a: IFetchedRWAProject) => ({
				id: a.id,
				ticker: a.ticker,
				assetName: a.assetName ?? null,
				iconUrl: resolveIconUrl(a),
				totalActiveMcap: getTotalFromMap(a.activeMcap)
			}))
			.sort((a: RWAAssetOption, b: RWAAssetOption) => b.totalActiveMcap - a.totalActiveMcap)
	}, [data])

	return { assets, isLoading }
}
