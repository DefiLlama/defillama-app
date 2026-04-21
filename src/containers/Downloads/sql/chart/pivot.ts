export interface PivotOptions {
	topN?: number
	otherLabel?: string
}

export interface PivotResult {
	keys: string[]
	rows: Array<Record<string, number | string | null>>
	truncatedCount: number
}

function toNumber(v: unknown): number | null {
	if (v == null) return null
	if (typeof v === 'number') return Number.isFinite(v) ? v : null
	if (typeof v === 'bigint') return Number(v)
	if (typeof v === 'string') {
		const trimmed = v.trim()
		if (trimmed === '') return null
		const n = Number(trimmed)
		return Number.isFinite(n) ? n : null
	}
	return null
}

function splitKey(v: unknown): string {
	if (v == null) return '∅'
	if (typeof v === 'string') return v
	return String(v)
}

export function pivotRowsForSplit(
	rows: Record<string, unknown>[],
	xCol: string,
	yCol: string,
	splitCol: string,
	opts: PivotOptions = {}
): PivotResult {
	const topN = opts.topN ?? 20
	const otherLabel = opts.otherLabel ?? 'Other'

	const magnitudeByKey = new Map<string, number>()
	for (const row of rows) {
		const key = splitKey(row[splitCol])
		const yn = toNumber(row[yCol])
		if (yn == null) continue
		magnitudeByKey.set(key, (magnitudeByKey.get(key) ?? 0) + Math.abs(yn))
	}

	const ranked = [...magnitudeByKey.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
	const topKeys = ranked.slice(0, topN)
	const truncated = ranked.slice(topN)
	const truncatedSet = new Set(truncated)
	const hasOther = truncated.length > 0
	const keys = hasOther ? [...topKeys, otherLabel] : [...topKeys]

	const byX = new Map<string | number, Record<string, number | string | null>>()
	for (const row of rows) {
		const xv = row[xCol]
		const xKey = typeof xv === 'number' ? xv : xv == null ? '∅' : String(xv)
		let bucket = byX.get(xKey)
		if (!bucket) {
			bucket = { [xCol]: (xv as number | string | null) ?? null }
			for (const k of keys) bucket[k] = null
			byX.set(xKey, bucket)
		}
		const sk = splitKey(row[splitCol])
		const target = truncatedSet.has(sk) ? otherLabel : topKeys.includes(sk) ? sk : null
		if (target == null) continue
		const yn = toNumber(row[yCol])
		if (yn == null) continue
		bucket[target] = ((bucket[target] as number | null) ?? 0) + yn
	}

	const sortedX = [...byX.values()].sort((a, b) => compareX(a[xCol], b[xCol]))

	return { keys, rows: sortedX, truncatedCount: truncated.length }
}

function compareX(a: unknown, b: unknown): number {
	if (typeof a === 'number' && typeof b === 'number') return a - b
	const as = a == null ? '' : String(a)
	const bs = b == null ? '' : String(b)
	return as < bs ? -1 : as > bs ? 1 : 0
}
