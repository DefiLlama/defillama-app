import { getProtocolEmissons } from '~/containers/Unlocks/queries'
import { getTokenMarketDataFromCgChart } from '~/containers/Unlocks/tokenMarketData'
import { slug } from '~/utils'

export function calculateTotalUnlockValue(emissions: any): number {
	if (!emissions?.tokenPrice?.price) return 0

	const events = Array.isArray(emissions?.upcomingEvent) ? emissions.upcomingEvent : []
	const totalAmount = events.reduce((sum, event) => {
		const tokens = Array.isArray(event?.noOfTokens) ? event.noOfTokens : []
		const eventTotal = tokens.reduce((eventSum, amount) => eventSum + (Number(amount) || 0), 0)
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
