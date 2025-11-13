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

	const totals = useMemo(
		() =>
			(Array.isArray(data) ? data : []).reduce(
				(acc, chain) => {
					const tvl = typeof chain?.tvl === 'number' ? chain.tvl : 0
					const stables = typeof chain?.stablesMcap === 'number' ? chain.stablesMcap : 0
					const volume = typeof chain?.totalVolume24h === 'number' ? chain.totalVolume24h : 0

					acc.tvl += tvl > 0 ? tvl : 0
					acc.stables += stables > 0 ? stables : 0
					acc.volume24h += volume > 0 ? volume : 0
					return acc
				},
				{ tvl: 0, stables: 0, volume24h: 0 }
			),
		[data]
	)

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

			const protocols = typeof chain.protocols === 'number' ? chain.protocols : null
			const users = typeof chain.users === 'number' ? chain.users : null
			const bridgedTvl = chain.bridgedTvl ?? null
			const stablesMcap = chain.stablesMcap ?? null
			const chainAny = chain as Record<string, any>
			const volume24h = chain.totalVolume24h ?? null
			const volume7d = chainAny?.totalVolume7d ?? null
			const volume30d = chain.totalVolume30d ?? null
			const tvlShare = totals.tvl > 0 && tvl ? (tvl / totals.tvl) * 100 : null
			const stablesShare =
				totals.stables > 0 && stablesMcap !== null && stablesMcap !== undefined
					? (stablesMcap / totals.stables) * 100
					: null
			const volume24hShare =
				totals.volume24h > 0 && volume24h ? (volume24h / totals.volume24h) * 100 : null

			const metrics: NumericMetrics = {
				tvl,
				tvlPrevDay: derivePrevFromChange(tvl, change1d),
				tvlPrevWeek: derivePrevFromChange(tvl, change7d),
				tvlPrevMonth: derivePrevFromChange(tvl, change1m),
				change1d,
				change7d,
				change1m,
				users,
				bridgedTvl,
				stablesMcap,
				nftVolume: chain.nftVolume ?? null,
				tvlShare,
				stablesShare,
				volume24hShare,
				volume24h,
					volume_7d: volume7d,
					volume_30d: volume30d,
					fees24h: chain.totalFees24h ?? null,
					fees_7d: chainAny?.totalFees7d ?? null,
					fees_30d: chain.totalFees30d ?? null,
					revenue24h: chain.totalAppRevenue24h ?? null,
					revenue_7d: chainAny?.totalAppRevenue7d ?? null,
					revenue_30d: chain.totalAppRevenue30d ?? null,
				perpsVolume24h: null,
				openInterest: null,
				mcap: chain.mcap ?? null,
				protocolCount: protocols
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
