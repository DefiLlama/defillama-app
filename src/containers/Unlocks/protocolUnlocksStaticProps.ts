import { fetchCgChartByGeckoId } from '~/api'
import { getProtocolEmissons } from '~/containers/Unlocks/queries'
import { slug } from '~/utils'
import type { ITokenListEntry } from '~/utils/metadata/types'
import type { EmissionEvent } from './api.types'

export function calculateTotalUnlockValue(emissions: {
	tokenPrice?: { price?: number | null } | null
	upcomingEvent?: EmissionEvent[] | null
}): number {
	if (!emissions?.tokenPrice?.price) return 0

	const events = Array.isArray(emissions?.upcomingEvent) ? emissions.upcomingEvent : []
	const totalAmount = events.reduce((sum: number, event: EmissionEvent) => {
		const tokens = Array.isArray(event?.noOfTokens) ? event.noOfTokens : []
		const eventTotal = tokens.reduce((eventSum: number, amount: number) => eventSum + (Number(amount) || 0), 0)
		return sum + eventTotal
	}, 0)

	return (totalAmount || 0) * emissions.tokenPrice.price
}

export function getEventCountdown(timestamp: number | null | undefined): string {
	if (!timestamp) return ''
	const now = Math.floor(Date.now() / 1000)
	const timeLeft = timestamp - now

	if (timeLeft <= 0) return 'now'

	const hoursLeft = Math.floor(timeLeft / 3600)
	const daysLeft = Math.floor(hoursLeft / 24)
	const minutesLeft = Math.floor(timeLeft / 60)

	if (daysLeft >= 1) {
		return `in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`
	}

	if (hoursLeft >= 1) {
		return `in ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}`
	}

	if (minutesLeft >= 1) {
		return `in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}`
	}

	return 'in less than a minute'
}

export async function getProtocolUnlocksStaticPropsData(
	protocolParam: string,
	tokenlist: Record<string, ITokenListEntry>
) {
	const normalizedName = slug(protocolParam)

	const emissions = await getProtocolEmissons(normalizedName).catch(() => null)
	const geckoId = emissions?.geckoId ?? emissions?.meta?.gecko_id ?? null
	const tokenEntry = geckoId ? (tokenlist[geckoId] ?? null) : null
	const cgChart = geckoId ? await fetchCgChartByGeckoId(geckoId, { fullChart: false }).catch(() => null) : null
	const cgMarketData = cgChart?.data?.coinData?.market_data
	const initialTokenMarketData = tokenEntry
		? {
				price: tokenEntry.current_price ?? null,
				prevPrice:
					tokenEntry.price_change_24h != null ? (tokenEntry.current_price ?? 0) - tokenEntry.price_change_24h : null,
				priceChangePercent: tokenEntry.price_change_percentage_24h ?? null,
				mcap: tokenEntry.market_cap ?? null,
				volume24h: tokenEntry.total_volume ?? null,
				circSupply: tokenEntry.circulating_supply ?? null,
				maxSupply: tokenEntry.max_supply ?? null,
				maxSupplyInfinite: cgMarketData?.max_supply_infinite ?? null
			}
		: null

	return {
		normalizedName,
		emissions,
		geckoId,
		initialTokenMarketData
	}
}
