import type { Segment } from './types'

export const SEGMENTS: ReadonlyArray<{ id: Segment; label: string; hasOi: boolean }> = [
	{ id: 'spot', label: 'Spot', hasOi: false },
	{ id: 'linear_perp', label: 'Linear Perp', hasOi: true },
	{ id: 'inverse_perp', label: 'Inverse Perp', hasOi: true }
]

export const SEGMENT_IDS: ReadonlyArray<Segment> = SEGMENTS.map((segment) => segment.id)

const SEGMENT_HAS_OI: Record<Segment, boolean> = Object.fromEntries(
	SEGMENTS.map((segment) => [segment.id, segment.hasOi])
) as Record<Segment, boolean>

export function isSegment(value: unknown): value is Segment {
	return SEGMENT_IDS.includes(value as Segment)
}

export function segmentHasOi(segment: Segment): boolean {
	return SEGMENT_HAS_OI[segment]
}

/** Pick the requested segment if it has data, else the first available one. */
export function resolveSegment(requested: Segment, available: ReadonlyArray<Segment>): Segment {
	return available.includes(requested) ? requested : (available[0] ?? requested)
}
