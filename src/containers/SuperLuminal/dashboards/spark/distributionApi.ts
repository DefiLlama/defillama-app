import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { assignColors, fetchDuneQuery, pivotByDate } from './api'

interface DistRevenueRow {
	dt: string
	token_symbol: string
	tw_reward_usd: number
}

interface DistRevenueProjRow {
	dt: string
	token_symbol: string
	tw_reward_proj_usd: number
}

interface DistTvlRow {
	dt: string
	token: string
	sp_amount: number
}

interface DistXrRow {
	dt: string
	integrator_name: string
	tw_reward_usd: number
}

export function useDistActualRevenue() {
	const query = useQuery({
		queryKey: ['dune-dist-actual-revenue'],
		queryFn: () => fetchDuneQuery<DistRevenueRow>('5582217'),
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const rows = query.data?.result?.rows ?? []
		const keys = [...new Set(rows.map((r) => r.token_symbol))].sort()
		const colors = assignColors(keys)
		const chartData = pivotByDate(rows, 'token_symbol', 'tw_reward_usd')
		return { ...query, chartData, keys, colors }
	}, [query])
}

export function useDistRevenueProjection() {
	const query = useQuery({
		queryKey: ['dune-dist-revenue-projection'],
		queryFn: () => fetchDuneQuery<DistRevenueProjRow>('5524703'),
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const rows = query.data?.result?.rows ?? []
		const keys = [...new Set(rows.map((r) => r.token_symbol))].sort()
		const colors = assignColors(keys)
		const chartData = pivotByDate(rows, 'token_symbol', 'tw_reward_proj_usd')
		return { ...query, chartData, keys, colors }
	}, [query])
}

export function useDistSusdsTvl() {
	const query = useQuery({
		queryKey: ['dune-dist-susds-tvl'],
		queryFn: () => fetchDuneQuery<DistTvlRow>('5449746'),
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const rows = query.data?.result?.rows ?? []
		const keys = [...new Set(rows.map((r) => r.token))].sort()
		const colors = assignColors(keys)
		const chartData = pivotByDate(rows, 'token', 'sp_amount')
		return { ...query, chartData, keys, colors }
	}, [query])
}

export function useDistXrSusds() {
	const query = useQuery({
		queryKey: ['dune-dist-xr-susds'],
		queryFn: () => fetchDuneQuery<DistXrRow>('5305217'),
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const rows = query.data?.result?.rows ?? []
		const keys = [...new Set(rows.map((r) => r.integrator_name))].sort()
		const colors = assignColors(keys)
		const chartData = pivotByDate(rows, 'integrator_name', 'tw_reward_usd')
		return { ...query, chartData, keys, colors }
	}, [query])
}

export function useDistXrSusdc() {
	const query = useQuery({
		queryKey: ['dune-dist-xr-susdc'],
		queryFn: () => fetchDuneQuery<DistXrRow>('5305223'),
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const rows = query.data?.result?.rows ?? []
		const keys = [...new Set(rows.map((r) => r.integrator_name))].sort()
		const colors = assignColors(keys)
		const chartData = pivotByDate(rows, 'integrator_name', 'tw_reward_usd')
		return { ...query, chartData, keys, colors }
	}, [query])
}

export function useDistStakedUsdsTvl() {
	const query = useQuery({
		queryKey: ['dune-dist-staked-usds-tvl'],
		queryFn: () => fetchDuneQuery<DistTvlRow>('5449825'),
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const rows = query.data?.result?.rows ?? []
		const keys = [...new Set(rows.map((r) => r.token))].sort()
		const colors = assignColors(keys)
		const chartData = pivotByDate(rows, 'token', 'sp_amount')
		return { ...query, chartData, keys, colors }
	}, [query])
}
