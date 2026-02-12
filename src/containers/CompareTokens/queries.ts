import { getAllCGTokensList, maxAgeForNext } from '~/api'
import type { IResponseCGMarketsAPI } from '~/api/types'
import { fetchFeesProtocols, fetchProtocolsList, fetchRevenueProtocols } from './api'
import type { Protocol } from './types'

type CompareTokensPageData = {
	props: {
		coinsData: Array<IResponseCGMarketsAPI & { label: string; value: string }>
		protocols: Protocol[]
	}
	revalidate: number
}

export async function getCompareTokensPageData(): Promise<CompareTokensPageData> {
	const [coinsData, tvlProtocols, feesProtocols, revenueProtocols] = await Promise.all([
		getAllCGTokensList(),
		fetchProtocolsList(),
		fetchFeesProtocols(),
		fetchRevenueProtocols()
	])

	const parentProtocols: Record<
		string,
		{ name: string; geckoId: string | null; tvl: number | null; fees: number | null; revenue: number | null }
	> = {}

	for (const protocol of tvlProtocols.parentProtocols) {
		parentProtocols[protocol.id] = {
			name: protocol.name,
			geckoId: protocol.gecko_id ?? null,
			tvl: null,
			fees: null,
			revenue: null
		}
	}

	const llamaProtocols: Protocol[] = tvlProtocols.protocols.map((protocol) => {
		const fees = feesProtocols.protocols.find((fp) => fp.defillamaId === protocol.defillamaId)?.total24h ?? null
		const revenue = revenueProtocols.protocols.find((fp) => fp.defillamaId === protocol.defillamaId)?.total24h ?? null

		if (protocol.parentProtocol && parentProtocols[protocol.parentProtocol]) {
			if (protocol.tvl) {
				parentProtocols[protocol.parentProtocol].tvl =
					(parentProtocols[protocol.parentProtocol].tvl ?? 0) + protocol.tvl
			}
			if (fees) {
				parentProtocols[protocol.parentProtocol].fees = (parentProtocols[protocol.parentProtocol].fees ?? 0) + fees
			}
			if (revenue) {
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
		props: {
			coinsData: coinsData.map((coin) => ({ ...coin, label: coin.symbol.toUpperCase(), value: coin.id })),
			protocols: [...Object.values(parentProtocols), ...llamaProtocols]
		},
		revalidate: maxAgeForNext([22])
	}
}
