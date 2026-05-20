export interface UnlockHistoricalPriceEvent {
	timestamp?: number | null
	category?: string | null
	noOfTokens?: number[] | null
}

export interface UnlockHistoricalPriceProtocol {
	name?: string
	token?: string
	gecko_id?: string | null
	events?: UnlockHistoricalPriceEvent[] | null
}

function roundToNearestHalfHour(timestamp: number): number {
	return Math.floor(timestamp / 1800) * 1800
}

export function buildUnlocksHistoricalPriceRequests(
	protocols: UnlockHistoricalPriceProtocol[],
	nowSec: number = Date.now() / 1000
): {
	priceReqs: Record<string, number[]>
	lastPastTimestampByCoinKey: Map<string, number>
} {
	const weekAgoSec = nowSec - 7 * 24 * 60 * 60
	const priceReqs: Record<string, number[]> = {}
	const lastPastTimestampByCoinKey = new Map<string, number>()

	for (const protocol of protocols) {
		const geckoId = protocol?.gecko_id
		if (!geckoId) continue

		const coinKey = `coingecko:${geckoId}`
		const events = Array.isArray(protocol?.events) ? protocol.events : []

		let earliestEvent: number | undefined
		let lastPastEvent: number | undefined

		for (const e of events) {
			const ts = e?.timestamp
			if (typeof ts !== 'number' || !Number.isFinite(ts)) continue
			if (earliestEvent == null || ts < earliestEvent) earliestEvent = ts

			const cat = e?.category
			if (cat === 'noncirculating' || cat === 'farming') continue

			const roundedTs = roundToNearestHalfHour(ts)
			if (roundedTs < weekAgoSec && (lastPastEvent == null || roundedTs > lastPastEvent)) {
				lastPastEvent = roundedTs
			}
		}

		if (lastPastEvent == null) continue

		lastPastTimestampByCoinKey.set(coinKey, lastPastEvent)
		if (earliestEvent != null && lastPastEvent === roundToNearestHalfHour(earliestEvent)) continue

		const anchor = Math.floor(lastPastEvent / 86400) * 86400
		const timestamps: number[] = []
		for (let d = 7; d >= 1; d--) timestamps.push(anchor - d * 86400)
		timestamps.push(anchor)
		for (let d = 1; d <= 7; d++) timestamps.push(anchor + d * 86400)
		priceReqs[coinKey] = timestamps
	}

	return { priceReqs, lastPastTimestampByCoinKey }
}
