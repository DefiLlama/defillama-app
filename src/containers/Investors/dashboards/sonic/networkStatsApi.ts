import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

interface BurnData {
	price: number
	gasPrice: number
	totalSupply: number
	initialSupply: number
	netIssuance: number
	feesPerDay: number
	permanentBurnPerDay: number
	permanentBurnPerYear: number
	feeMPerDay: number
	validatorFeesPerDay: number
	burnRatePercent: number
	feeDistribution: {
		feeMPercent: number
		burntPercent: number
		validatorPercent: number
	}
	currentEpoch: number
	lastEpochFee: number
	lastEpochEndTime: number
	avgEpochDuration: number
}

interface NetworkStatsAPIResponse {
	blockNumber: number | null
	gasPrice: { gwei: number; wei: number } | null
	totalSupplyWei: string | null
	burnData: BurnData | null
	uptimeUrl: string
}

function formatNumber(n: number): string {
	if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
	if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
	if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
	return n.toLocaleString('en-US')
}

function formatS(n: number): string {
	return `${formatNumber(n)} S`
}

export function useNetworkStatsData() {
	const query = useQuery<NetworkStatsAPIResponse>({
		queryKey: ['sonic-network-stats'],
		queryFn: async () => {
			const res = await fetch('/api/sonic/network-stats')
			if (!res.ok) throw new Error(`Network stats API error: ${res.status}`)
			return res.json()
		},
		staleTime: 2 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		if (!query.data) {
			return { data: null, isLoading: query.isLoading || query.isPending }
		}

		const d = query.data
		const burn = d.burnData

		return {
			data: {
				network: {
					blockNumber: d.blockNumber != null ? { value: d.blockNumber, formatted: d.blockNumber.toLocaleString('en-US') } : null,
					gasPrice: d.gasPrice != null ? { value: d.gasPrice.gwei, formatted: `${d.gasPrice.gwei.toFixed(0)} Gwei` } : null,
					price: burn != null ? { value: burn.price, formatted: `$${burn.price.toFixed(4)}` } : null,
					totalSupply: burn != null ? { value: burn.totalSupply, formatted: formatNumber(burn.totalSupply) } : null
				},
				tokenomics: burn != null ? {
					initialSupply: { value: burn.initialSupply, formatted: formatNumber(burn.initialSupply) },
					netIssuance: { value: burn.netIssuance, formatted: formatNumber(burn.netIssuance) },
					burnPerDay: { value: burn.permanentBurnPerDay, formatted: formatS(burn.permanentBurnPerDay) },
					burnPerYear: { value: burn.permanentBurnPerYear, formatted: formatS(burn.permanentBurnPerYear) }
				} : null,
				fees: burn != null ? {
					feesPerDay: { value: burn.feesPerDay, formatted: formatS(burn.feesPerDay) },
					feeMPerDay: { value: burn.feeMPerDay, formatted: formatS(burn.feeMPerDay) },
					validatorFeesPerDay: { value: burn.validatorFeesPerDay, formatted: formatS(burn.validatorFeesPerDay) },
					burnRate: { value: burn.burnRatePercent, formatted: `${(burn.burnRatePercent * 100).toFixed(2)}%` }
				} : null,
				epoch: burn != null ? {
					current: { value: burn.currentEpoch, formatted: burn.currentEpoch.toLocaleString('en-US') },
					avgDuration: { value: burn.avgEpochDuration, formatted: `~${Math.round(burn.avgEpochDuration / 60)} min` },
					lastFee: { value: burn.lastEpochFee, formatted: `${burn.lastEpochFee.toFixed(2)} S` }
				} : null,
				uptimeUrl: d.uptimeUrl
			},
			isLoading: false
		}
	}, [query.data, query.isLoading, query.isPending])
}
