import { getProtocolEmissons } from '~/containers/Unlocks/queries'
import { getTokenMarketDataFromCgChart } from '~/containers/Unlocks/tokenMarketData'
import { slug } from '~/utils'

export function calculateTotalUnlockValue(emissions: any): number {
	if (!emissions?.upcomingEvent || !emissions?.tokenPrice?.price) return 0

	const totalAmount = emissions.upcomingEvent?.reduce((sum, event) => {
		const eventTotal = event?.noOfTokens?.reduce((eventSum, amount) => eventSum + amount, 0)
		return sum + eventTotal
	}, 0)

	return totalAmount * emissions.tokenPrice.price
}

export function getEventCountdown(timestamp: number | null | undefined): string {
	if (!timestamp) return ''
	const now = Math.floor(Date.now() / 1000)
	const timeLeft = timestamp - now

	const hoursLeft = Math.floor(timeLeft / 3600)
	const daysLeft = Math.floor(hoursLeft / 24)

	if (daysLeft >= 1) {
		return `in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`
	}

	return `in ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}`
}

export async function getProtocolUnlocksStaticPropsData(protocolParam: string) {
	const normalizedName = slug(protocolParam)

	const emissions = await getProtocolEmissons(normalizedName).catch(() => null as any)
	const geckoId = emissions?.geckoId ?? emissions?.meta?.gecko_id ?? null
	const initialTokenMarketData = geckoId ? await getTokenMarketDataFromCgChart(geckoId).catch(() => null) : null

	return {
		normalizedName,
		emissions,
		geckoId,
		initialTokenMarketData
	}
}
