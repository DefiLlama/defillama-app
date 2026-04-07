import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

interface FormattedValue {
	value: number
	formatted: string
}

interface ChartSeries {
	name: string
	data: number[]
}

interface ChartData {
	title: string
	dates: string[]
	series: ChartSeries[]
}

interface TopToken {
	symbol: string
	contractAddress: string
	transferCount: number
	volumeUsd: number
	volumeFormatted: string
	uniqueSenders: number
}

interface BlockchainAPIResponse {
	metadata: {
		projectName: string
		updatedAt: string
		links?: Record<string, string>
	}
	blockchain: {
		chainActivity: ChartData
		activityKpis: {
			latestTxCount: FormattedValue
			latestActiveAddresses: FormattedValue
			avgDailyTxs7d: FormattedValue
			avgDailyTxs30d: FormattedValue
			totalTxsAllTime: FormattedValue
		}
		gasFees: ChartData
		gasKpis: {
			totalFees7d: FormattedValue
			totalFees30d: FormattedValue
			totalFeesAllTime: FormattedValue
			avgFeePerTx: FormattedValue
		}
		blockUtilization: ChartData
		contractDeployments: ChartData
		tokenTransfers: ChartData
		topTokens: TopToken[]
	}
}

export type { FormattedValue, TopToken, BlockchainAPIResponse }

export function useBlockchainData() {
	const query = useQuery<BlockchainAPIResponse>({
		queryKey: ['berachain-blockchain'],
		queryFn: async () => {
			const res = await fetch('/api/berachain/blockchain')
			if (!res.ok) throw new Error(`Berachain Blockchain API error: ${res.status}`)
			return res.json()
		},
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		if (!query.data) {
			return { data: null, isLoading: query.isLoading || query.isPending }
		}

		const { metadata, blockchain } = query.data

		return {
			data: { metadata, ...blockchain },
			isLoading: false
		}
	}, [query.data, query.isLoading, query.isPending])
}
