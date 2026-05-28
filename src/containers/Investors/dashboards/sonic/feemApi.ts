import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

interface FormattedValue {
	value: number
	formatted: string
}

interface FeeMGlobalKpis {
	totalContracts: FormattedValue
	totalTransactions: FormattedValue
	totalCollected: FormattedValue
	totalClaimed: FormattedValue
	gasMonetizationAddress: string
}

export interface FeeMLeaderboardEntry {
	id: number
	name: string
	imageUrl: string | null
	websiteUrl: string | null
	isActive: boolean
	transactionsCount: number
	transactionsFormatted: string
	contractsCount: number
	collectedRewards: number
	collectedRewardsFormatted: string
	claimedRewards: number
	rewardsToClaim: number
}

interface TimeSeriesData {
	title: string
	dates: string[]
	series: Array<{ name: string; data: number[] }>
}

interface FeeMAPIResponse {
	metadata: {
		projectId: number
		projectName: string
		updatedAt: string
		links: Record<string, string>
	}
	feem: {
		globalKpis: FeeMGlobalKpis
		leaderboard: FeeMLeaderboardEntry[]
		dailyStats: TimeSeriesData
	}
}

function parseDateToUnix(dateStr: string): number {
	return Math.floor(new Date(dateStr + 'T00:00:00Z').getTime() / 1000)
}

export function useFeeMData() {
	const query = useQuery<FeeMAPIResponse>({
		queryKey: ['sonic-feem'],
		queryFn: async () => {
			const res = await fetch('/api/sonic/feem')
			if (!res.ok) throw new Error(`FeeM API error: ${res.status}`)
			return res.json()
		},
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		if (!query.data) {
			return { data: null, isLoading: query.isLoading || query.isPending }
		}

		const { feem } = query.data

		const dailyStatsSeries = feem.dailyStats.series.map((s, i) => ({
			name: s.name,
			type: (i === 0 ? 'bar' : 'line') as 'bar' | 'line',
			color: i === 0 ? '#4691ce' : '#4cae4f',
			data: feem.dailyStats.dates.map((d, j) => [parseDateToUnix(d), s.data[j]] as [number, number]),
			yAxisIndex: i === 0 ? 0 : 1,
			areaStyle: i === 1 ? { opacity: 0 } : undefined
		}))

		return {
			data: {
				globalKpis: feem.globalKpis,
				leaderboard: feem.leaderboard,
				dailyStatsSeries,
				dailyStatsTitle: feem.dailyStats.title
			},
			isLoading: false
		}
	}, [query.data, query.isLoading, query.isPending])
}
