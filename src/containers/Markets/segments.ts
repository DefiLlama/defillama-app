export const SEGMENTS = [
	{ id: 'spot', label: 'Spot', hasOi: false },
	{ id: 'linear_perp', label: 'Linear Perp', hasOi: true },
	{ id: 'inverse_perp', label: 'Inverse Perp', hasOi: true }
] as const

export type Segment = (typeof SEGMENTS)[number]['id']

export const SEGMENT_IDS: ReadonlyArray<Segment> = SEGMENTS.map((segment) => segment.id)

const SEGMENT_HAS_OI = new Map<Segment, boolean>()
for (const segment of SEGMENTS) SEGMENT_HAS_OI.set(segment.id, segment.hasOi)

export function isSegment(value: unknown): value is Segment {
	return SEGMENT_IDS.some((segment) => segment === value)
}

export function segmentHasOi(segment: Segment): boolean {
	return SEGMENT_HAS_OI.get(segment) === true
}

export function recordBySegment<T>(make: (segment: Segment) => T): Record<Segment, T> {
	const out = {} as Record<Segment, T>
	for (const segment of SEGMENT_IDS) out[segment] = make(segment)
	return out
}

/** Pick the requested segment if it has data, else the first available one. */
export function resolveSegment(requested: Segment, available: ReadonlyArray<Segment>): Segment {
	return available.includes(requested) ? requested : (available[0] ?? requested)
}
