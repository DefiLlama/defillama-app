import type { IHackApiItem } from '~/containers/Hacks/api.types'

export type HallmarkPoint = [number, string]
export type HallmarkRange = [[number, number], string]

type HallmarkDimensions =
	| Record<string, { genuineSpikes?: Array<[string, string]>; adapter?: string }>
	| null
	| undefined

function normalizeHallmarkTimestampToSeconds(timestamp: number): number {
	return timestamp >= 1e12 ? Math.floor(timestamp / 1e3) : timestamp
}

function buildHackHallmarkMap(hacks?: IHackApiItem[] | null): Map<number, string> {
	const hallmarkMap = new Map<number, string>()

	for (const hack of hacks ?? []) {
		hallmarkMap.set(hack.date, `Hack: ${hack.classification ?? ''}`)
	}

	return hallmarkMap
}

function buildPointHallmarkMap({
	protocolHallmarks,
	dimensions
}: {
	protocolHallmarks?: Array<unknown> | null
	dimensions?: HallmarkDimensions
}): Map<number, string> {
	const hallmarkMap = new Map<number, string>()

	for (const mark of protocolHallmarks ?? []) {
		if (!Array.isArray(mark)) continue
		if (!Array.isArray(mark[0]) && typeof mark[0] === 'number' && mark[1] !== '-') {
			const timestamp = normalizeHallmarkTimestampToSeconds(mark[0])
			if (!hallmarkMap.has(timestamp)) {
				hallmarkMap.set(timestamp, String(mark[1]))
			}
		}
	}

	if (dimensions) {
		for (const dimKey in dimensions) {
			const spikes = dimensions[dimKey]?.genuineSpikes
			if (!spikes) continue

			for (const [dateStr, label] of spikes) {
				if (label === '-') continue
				const timestamp = Math.floor(new Date(dateStr).getTime() / 1e3)
				if (!Number.isFinite(timestamp) || hallmarkMap.has(timestamp)) continue
				hallmarkMap.set(timestamp, label)
			}
		}
	}

	return hallmarkMap
}

function buildRangeHallmarksInMs(protocolHallmarks?: Array<unknown> | null): HallmarkRange[] {
	const rangeHallmarks: HallmarkRange[] = []

	for (const mark of protocolHallmarks ?? []) {
		if (!Array.isArray(mark) || mark[1] === '-') continue
		if (!Array.isArray(mark[0])) continue

		const [start, end] = mark[0]
		if (typeof start !== 'number' || typeof end !== 'number') continue

		rangeHallmarks.push([
			[normalizeHallmarkTimestampToSeconds(start) * 1e3, normalizeHallmarkTimestampToSeconds(end) * 1e3],
			String(mark[1])
		])
	}

	return rangeHallmarks
}

/**
 * Convert `dimensions.*.genuineSpikes` tuples from the adapter API into
 * hallmark-compatible `[timestampSeconds, label]` entries and merge them
 * with any pre-existing protocol point hallmarks.
 *
 * Timestamps are in seconds because most chart layers multiply by 1e3 when
 * rendering mark lines.
 */
export function buildHallmarksWithGenuineSpikes({
	protocolHallmarks,
	dimensions
}: {
	protocolHallmarks?: Array<unknown> | null
	dimensions?: HallmarkDimensions
}): HallmarkPoint[] | null {
	const hallmarkMap = buildPointHallmarkMap({ protocolHallmarks, dimensions })

	if (hallmarkMap.size === 0) return null

	return Array.from(hallmarkMap.entries()).sort((a, b) => a[0] - b[0])
}

export function buildProtocolOverviewHallmarks({
	hacks,
	protocolHallmarks,
	dimensions
}: {
	hacks?: IHackApiItem[] | null
	protocolHallmarks?: Array<unknown> | null
	dimensions?: HallmarkDimensions
}): {
	hallmarks: HallmarkPoint[]
	rangeHallmarks: HallmarkRange[]
} {
	const hallmarkMap = buildHackHallmarkMap(hacks)
	const pointHallmarks = buildHallmarksWithGenuineSpikes({ protocolHallmarks, dimensions }) ?? []

	for (const [timestamp, label] of pointHallmarks) {
		if (!hallmarkMap.has(timestamp)) {
			hallmarkMap.set(timestamp, label)
		}
	}

	return {
		hallmarks: Array.from(hallmarkMap.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([timestamp, label]) => [timestamp * 1e3, label]),
		rangeHallmarks: buildRangeHallmarksInMs(protocolHallmarks)
	}
}
