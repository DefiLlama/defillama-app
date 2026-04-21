import type { QueryResult } from './exportResults'

export type FineKind = 'date' | 'int' | 'float' | 'text' | 'bool' | 'list' | 'other'
export type CoarseKind = 'date' | 'number' | 'category' | 'other'

export interface ClassifiedColumn {
	name: string
	fine: FineKind
	coarse: CoarseKind
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/

export function inferFineKindFromArrowType(typeString: string | undefined): FineKind {
	if (!typeString) return 'other'
	if (/^List|^LargeList|LIST</i.test(typeString)) return 'list'
	if (/^Struct|^Map|^Union|^Dictionary|^FixedSizeList/i.test(typeString)) return 'other'
	if (/Date|Timestamp/i.test(typeString)) return 'date'
	if (/Float|Decimal|Double/i.test(typeString)) return 'float'
	if (/Int|Long|Short/i.test(typeString)) return 'int'
	if (/Bool/i.test(typeString)) return 'bool'
	if (/Utf8|String/i.test(typeString)) return 'text'
	return 'other'
}

export function coarsen(fine: FineKind): CoarseKind {
	if (fine === 'date') return 'date'
	if (fine === 'int' || fine === 'float') return 'number'
	if (fine === 'text' || fine === 'bool') return 'category'
	return 'other'
}

export function looksLikeISODate(value: unknown): boolean {
	return typeof value === 'string' && ISO_DATE_RE.test(value)
}

export function looksLikeNumericArray(value: unknown): boolean {
	return Array.isArray(value) && value.every((v) => v == null || typeof v === 'number')
}

export function classifyColumn(
	typeString: string | undefined,
	name: string,
	rows: Record<string, unknown>[]
): ClassifiedColumn {
	let fine = inferFineKindFromArrowType(typeString)

	if (fine === 'text') {
		const sample: unknown[] = []
		for (const row of rows) {
			const v = row[name]
			if (v != null && v !== '') {
				sample.push(v)
				if (sample.length >= 20) break
			}
		}
		if (sample.length > 0 && sample.every(looksLikeISODate)) fine = 'date'
	}

	if (fine !== 'list' && fine !== 'date') {
		for (const row of rows) {
			const v = row[name]
			if (v == null) continue
			if (looksLikeNumericArray(v)) fine = 'list'
			break
		}
	}

	return { name, fine, coarse: coarsen(fine) }
}

export function classifyColumns(result: QueryResult): ClassifiedColumn[] {
	return result.columns.map((c) => classifyColumn(c.type, c.name, result.rows))
}
