import type { IAdapterChainMetrics } from '~/containers/AdapterMetrics/api.types'
import type { IAdapterChainOverview } from '~/containers/AdapterMetrics/types'
import type { IChildProtocol } from './types'

type DimensionFees = Omit<NonNullable<IChildProtocol['fees']>, 'pf'>
type DimensionRevenue = Omit<NonNullable<IChildProtocol['revenue']>, 'ps'>
type DimensionMetricProtocol = IAdapterChainMetrics['protocols'][number]
type DimensionDexProtocol = IAdapterChainOverview['protocols'][number]

export interface IProtocolRankingsDimensionMetrics {
	fees?: DimensionFees
	revenue?: DimensionRevenue
	holdersRevenue?: NonNullable<IChildProtocol['holdersRevenue']>
	dexs?: NonNullable<IChildProtocol['dexs']>
}

function hasAnyFeeFamilyTotal(protocol: DimensionMetricProtocol) {
	return (
		protocol.total24h != null ||
		protocol.total7d != null ||
		protocol.total30d != null ||
		protocol.total1y != null ||
		protocol.annualized1y != null ||
		protocol.monthlyAverage1y != null ||
		protocol.totalAllTime != null
	)
}

function hasAnyHoldersRevenueTotal(protocol: DimensionMetricProtocol) {
	return (
		protocol.total24h != null ||
		protocol.total7d != null ||
		protocol.total30d != null ||
		protocol.total1y != null ||
		protocol.monthlyAverage1y != null ||
		protocol.totalAllTime != null
	)
}

function hasAnyDexTotal(protocol: DimensionDexProtocol) {
	return protocol.total24h != null || protocol.total7d != null || protocol.totalAllTime != null
}

export function buildDimensionProtocolMetrics({
	fees,
	revenue,
	holdersRevenue,
	dexs
}: {
	fees: IAdapterChainMetrics | null
	revenue: IAdapterChainMetrics | null
	holdersRevenue: IAdapterChainMetrics | null
	dexs: IAdapterChainOverview | null
}) {
	const dimensionProtocols: Record<string, IProtocolRankingsDimensionMetrics> = {}

	for (const protocol of fees?.protocols ?? []) {
		if (!hasAnyFeeFamilyTotal(protocol)) continue
		const row = (dimensionProtocols[protocol.defillamaId] ??= {})
		row.fees = {
			total24h: protocol.total24h ?? null,
			total7d: protocol.total7d ?? null,
			total30d: protocol.total30d ?? null,
			total1y: protocol.total1y ?? null,
			annualized1y: protocol.annualized1y ?? null,
			monthlyAverage1y: protocol.monthlyAverage1y ?? null,
			totalAllTime: protocol.totalAllTime ?? null
		}
	}

	for (const protocol of revenue?.protocols ?? []) {
		if (!hasAnyFeeFamilyTotal(protocol)) continue
		const row = (dimensionProtocols[protocol.defillamaId] ??= {})
		row.revenue = {
			total24h: protocol.total24h ?? null,
			total7d: protocol.total7d ?? null,
			total30d: protocol.total30d ?? null,
			total1y: protocol.total1y ?? null,
			annualized1y: protocol.annualized1y ?? null,
			monthlyAverage1y: protocol.monthlyAverage1y ?? null,
			totalAllTime: protocol.totalAllTime ?? null
		}
	}

	for (const protocol of holdersRevenue?.protocols ?? []) {
		if (!hasAnyHoldersRevenueTotal(protocol)) continue
		const row = (dimensionProtocols[protocol.defillamaId] ??= {})
		row.holdersRevenue = {
			total24h: protocol.total24h ?? null,
			total7d: protocol.total7d ?? null,
			total30d: protocol.total30d ?? null,
			total1y: protocol.total1y ?? null,
			monthlyAverage1y: protocol.monthlyAverage1y ?? null,
			totalAllTime: protocol.totalAllTime ?? null
		}
	}

	for (const protocol of dexs?.protocols ?? []) {
		if (!hasAnyDexTotal(protocol)) continue
		const row = (dimensionProtocols[protocol.defillamaId] ??= {})
		row.dexs = {
			total24h: protocol.total24h ?? null,
			total7d: protocol.total7d ?? null,
			change_7dover7d: protocol.change_7dover7d ?? null,
			totalAllTime: protocol.totalAllTime ?? null
		}
	}

	return dimensionProtocols
}
