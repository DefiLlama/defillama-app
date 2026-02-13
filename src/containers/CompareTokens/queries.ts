import { getAllCGTokensList } from '~/api'
import type { IResponseCGMarketsAPI } from '~/api/types'
import { fetchAdapterChainMetrics } from '../DimensionAdapters/api'
import type { IAdapterChainMetrics } from '../DimensionAdapters/api.types'
import { ADAPTER_TYPES } from '../DimensionAdapters/constants'
import { fetchProtocolsList } from './api'
import type { RawProtocolsResponse } from './api.types'
import type { Protocol } from './types'

type CompareTokensPageData = {
	coinsData: Array<IResponseCGMarketsAPI & { label: string; value: string }>
	protocols: Protocol[]
}

export async function getCompareTokensPageData(): Promise<CompareTokensPageData> {
	const emptyProtocolsResponse: RawProtocolsResponse = { protocols: [], chains: [], parentProtocols: [] }
	const emptyAdapterProtocols: IAdapterChainMetrics['protocols'] = []

	const [coinsData, tvlProtocols, feesProtocols, revenueProtocols] = await Promise.all([
		getAllCGTokensList().catch((error) => {
			console.log(`Couldn't fetch CoinGecko tokens at path: compare-tokens`, 'Error:', error)
			return [] as IResponseCGMarketsAPI[]
		}),
		fetchProtocolsList().catch((error) => {
			console.log(`Couldn't fetch TVL protocols list at path: compare-tokens`, 'Error:', error)
			return emptyProtocolsResponse
		}),
		fetchAdapterChainMetrics({
			adapterType: ADAPTER_TYPES.FEES,
			chain: 'All'
		})
			.then((response) => response.protocols)
			.catch((error) => {
				console.log(`Couldn't fetch fees protocols list at path: compare-tokens`, 'Error:', error)
				return emptyAdapterProtocols
			}),
		fetchAdapterChainMetrics({
			adapterType: ADAPTER_TYPES.FEES,
			chain: 'All',
			dataType: 'dailyRevenue'
		})
			.then((response) => response.protocols)
			.catch((error) => {
				console.log(`Couldn't fetch revenue protocols list at path: compare-tokens`, 'Error:', error)
				return emptyAdapterProtocols
			})
	])

	const parentProtocols: Record<
		string,
		{ name: string; geckoId: string | null; tvl: number | null; fees: number | null; revenue: number | null }
	> = {}

	for (const protocol of tvlProtocols?.parentProtocols ?? []) {
		parentProtocols[protocol.id] = {
			name: protocol.name,
			geckoId: protocol.gecko_id ?? null,
			tvl: null,
			fees: null,
			revenue: null
		}
	}

	const feesByProtocolId = new Map(feesProtocols.map((fp) => [fp.defillamaId, fp.total24h ?? null] as const))
	const revenueByProtocolId = new Map(
		revenueProtocols.map((fp) => [fp.defillamaId, fp.total24h ?? null] as const)
	)

	const llamaProtocols: Protocol[] = (tvlProtocols?.protocols ?? []).map((protocol) => {
		const fees = feesByProtocolId.get(protocol.defillamaId) ?? null
		const revenue = revenueByProtocolId.get(protocol.defillamaId) ?? null

		if (protocol.parentProtocol && parentProtocols[protocol.parentProtocol]) {
			if (protocol.tvl != null) {
				parentProtocols[protocol.parentProtocol].tvl =
					(parentProtocols[protocol.parentProtocol].tvl ?? 0) + protocol.tvl
			}
			if (fees != null) {
				parentProtocols[protocol.parentProtocol].fees = (parentProtocols[protocol.parentProtocol].fees ?? 0) + fees
			}
			if (revenue != null) {
				parentProtocols[protocol.parentProtocol].revenue =
					(parentProtocols[protocol.parentProtocol].revenue ?? 0) + revenue
			}
		}

		return {
			name: protocol.name,
			tvl: protocol.tvl ?? null,
			geckoId: protocol.geckoId ?? null,
			fees,
			revenue
		}
	})

	return {
		coinsData: coinsData.map((coin) => ({ ...coin, label: coin.symbol.toUpperCase(), value: coin.id })),
		protocols: [...Object.values(parentProtocols), ...llamaProtocols]
	}
}
