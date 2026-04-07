import { EXTENDED_COLOR_PALETTE } from '~/containers/ProDashboard/utils/colorManager'

interface DuneResponse<T> {
	result: {
		rows: T[]
		metadata: {
			column_names: string[]
			column_types: string[]
			total_row_count: number
		}
	}
}

export async function fetchDuneQuery<T>(queryId: string): Promise<DuneResponse<T>> {
	const response = await fetch(`/api/dune/query/${queryId}`)
	if (!response.ok) throw new Error(`Dune API error: ${response.status}`)
	return response.json()
}

export function assignColors(names: string[]): Record<string, string> {
	const colors: Record<string, string> = {}
	const sorted = [...names].sort()
	for (let i = 0; i < sorted.length; i++) {
		colors[sorted[i]] = EXTENDED_COLOR_PALETTE[i % EXTENDED_COLOR_PALETTE.length]
	}
	return colors
}

export function pivotByDate<T extends { dt: string }>(
	rows: T[],
	groupKey: keyof T,
	valueKey: keyof T
): Array<Record<string, number>> {
	const map = new Map<number, Record<string, number>>()

	for (const row of rows) {
		const ts = Math.floor(new Date(row.dt).getTime() / 1000)
		if (!map.has(ts)) {
			map.set(ts, { date: ts })
		}
		const entry = map.get(ts)!
		const key = String(row[groupKey])
		entry[key] = (entry[key] ?? 0) + Number(row[valueKey])
	}

	return Array.from(map.values()).sort((a, b) => a.date - b.date)
}
