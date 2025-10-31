import { useMemo } from 'react'
import type { UnifiedRowHeaderType } from '../../../types'
import type { NormalizedRow, NumericMetrics } from '../types'
import { useChainsData } from '../../datasets/ChainsDataset/useChainsData'

export interface ChainsStrategyParams {
	category?: string | null
}

const derivePrevFromChange = (current: number | null | undefined, change: number | null | undefined) => {
	if (current === null || current === undefined || change === null || change === undefined) {
		return null
	}
	const denominator = 1 + change / 100
	if (!Number.isFinite(denominator) || denominator === 0) {
		return null
	}
	return current / denominator
}

export function useChainsStrategy(
	params: ChainsStrategyParams | null | undefined,
	_rowHeaders: UnifiedRowHeaderType[]
) {
	const category = params?.category || undefined
	const { data, isLoading, error } = useChainsData(category)

	const rows: NormalizedRow[] = useMemo(() => {
		if (!Array.isArray(data) || !data.length) {
			return []
		}

		return data.map((chain) => {
			const name = chain.name ?? 'Unknown Chain'
			const change1d = chain.change_1d ?? null
			const change7d = chain.change_7d ?? null
			const change1m = chain.change_1m ?? null
			const tvl = chain.tvl ?? null

			const metrics: NumericMetrics = {
				tvl,
				tvlPrevDay: derivePrevFromChange(tvl, change1d),
				tvlPrevWeek: derivePrevFromChange(tvl, change7d),
				tvlPrevMonth: derivePrevFromChange(tvl, change1m),
				change1d,
				change7d,
				change1m,
				volume24h: chain.totalVolume24h ?? null,
				fees24h: chain.totalFees24h ?? null,
				revenue24h: chain.totalAppRevenue24h ?? null,
				perpsVolume24h: null,
				openInterest: null,
				mcap: chain.mcap ?? null,
				protocolCount: chain.protocols ?? null
			}

			return {
				id: `chain-${name.toLowerCase().replace(/\s+/g, '-')}`,
				name,
				strategyType: 'chains',
				protocolId: undefined,
				chain: name,
				category: chain.category ?? null,
				metrics,
				original: chain
			} satisfies NormalizedRow
		})
	}, [data])

	return {
		rows,
		isLoading,
		error
	}
}

