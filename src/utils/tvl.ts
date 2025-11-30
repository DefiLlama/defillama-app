export const processAdjustedTvl = (data: any): [number, number][] => {
	const { tvl = [], liquidstaking = [], doublecounted = [], dcAndLsOverlap = [] } = data || {}

	const extraTvlCharts = {
		liquidstaking: {} as Record<number, number>,
		doublecounted: {} as Record<number, number>,
		dcAndLsOverlap: {} as Record<number, number>
	}

	for (const [date, totalLiquidityUSD] of liquidstaking) {
		extraTvlCharts.liquidstaking[Number(date)] = Math.trunc(totalLiquidityUSD)
	}
	for (const [date, totalLiquidityUSD] of doublecounted) {
		extraTvlCharts.doublecounted[Number(date)] = Math.trunc(totalLiquidityUSD)
	}
	for (const [date, totalLiquidityUSD] of dcAndLsOverlap) {
		extraTvlCharts.dcAndLsOverlap[Number(date)] = Math.trunc(totalLiquidityUSD)
	}

	const adjustedTvl: [number, number][] = tvl.map(([date, totalLiquidityUSD]) => {
		const timestamp = Number(date)
		let sum = Math.trunc(totalLiquidityUSD)
		if (extraTvlCharts['liquidstaking']?.[timestamp]) {
			sum -= Math.trunc(extraTvlCharts['liquidstaking'][timestamp])
		}
		if (extraTvlCharts['doublecounted']?.[timestamp]) {
			sum -= Math.trunc(extraTvlCharts['doublecounted'][timestamp])
		}
		if (extraTvlCharts['dcAndLsOverlap']?.[timestamp]) {
			sum += Math.trunc(extraTvlCharts['dcAndLsOverlap'][timestamp])
		}
		return [timestamp, sum] as [number, number]
	})

	return adjustedTvl
}

const toUtcDay = (ts: number): number => Math.floor(Number(ts) / 86400) * 86400
const startOfTodayUtc = (): number => {
	const now = new Date()
	return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000)
}
const filterOutToday = (pairs: [number, number][]): [number, number][] => {
	const today = startOfTodayUtc()
	return pairs.filter(([ts]) => ts < today)
}

export type ProtocolChainTvls = Record<
	string,
	{
		tvl?: Array<{ date: number | string; totalLiquidityUSD: number | string }>
	}
>

export interface AdjustProtocolTvlOptions {
	includeChains?: string[]
	excludeChains?: string[]
	filterMode?: 'include' | 'exclude'
}

const IGNORE_KEYS = ['staking', 'pool2', 'borrowed', 'vesting']
const ADJUST_KEYS = ['doublecounted', 'liquidstaking', 'dcAndLsOverlap'] as const
type AdjustKey = (typeof ADJUST_KEYS)[number]

const isIgnoreKey = (key: string): boolean => IGNORE_KEYS.some((k) => key === k || key.endsWith(`-${k}`))

const getAdjustType = (key: string): AdjustKey | null => {
	for (const k of ADJUST_KEYS) {
		if (key === k || key.endsWith(`-${k}`)) return k
	}
	return null
}

const getChainFromDerivedKey = (key: string, type: AdjustKey): string | null => {
	const suffix = `-${type}`
	return key.endsWith(suffix) ? key.slice(0, -suffix.length) : null
}

const toPairs = (arr: any[] | undefined): [number, number][] => {
	if (!Array.isArray(arr)) return []
	const byDay = new Map<number, { ts: number; v: number }>()

	for (const d of arr) {
		let tsRaw: number
		let vRaw: number

		if (Array.isArray(d)) {
			tsRaw = Number(d[0])
			vRaw = Math.trunc(Number(d[1]) || 0)
		} else {
			tsRaw = Number(d?.date)
			vRaw = Math.trunc(Number(d?.totalLiquidityUSD) || 0)
		}

		if (!Number.isFinite(tsRaw) || !Number.isFinite(vRaw)) continue
		const day = toUtcDay(tsRaw)
		const prev = byDay.get(day)
		if (!prev || tsRaw > prev.ts) {
			byDay.set(day, { ts: tsRaw, v: vRaw })
		}
	}
	const result = Array.from(byDay.entries())
		.sort((a, b) => a[0] - b[0])
		.map(([day, { v }]) => [day, v] as [number, number])
	return result
}

const accumulate = (store: Map<number, number>, pairs: [number, number][]) => {
	for (const [ts, v] of pairs) store.set(ts, (store.get(ts) || 0) + v)
}

export const processAdjustedProtocolTvl = (
	chainTvls: ProtocolChainTvls,
	options: AdjustProtocolTvlOptions = {}
): [number, number][] => {
	const includeSet = new Set((options.includeChains || []).filter(Boolean))
	const excludeSet = new Set((options.excludeChains || []).filter(Boolean))
	const filterMode =
		options.filterMode || (includeSet.size > 0 ? 'include' : excludeSet.size > 0 ? 'exclude' : 'include')

	const base = new Map<number, number>()
	const dc = new Map<number, number>()
	const ls = new Map<number, number>()
	const overlap = new Map<number, number>()

	const hasInclude = includeSet.size > 0
	const hasExclude = excludeSet.size > 0

	for (const [key, val] of Object.entries(chainTvls || {})) {
		if (!val || typeof val !== 'object') continue
		if (isIgnoreKey(key)) continue

		const adjustType = getAdjustType(key)
		const pairs = toPairs(val.tvl as any[])

		let include = true
		let chainScope: string | null = null
		if (adjustType) {
			chainScope = getChainFromDerivedKey(key, adjustType)
			if (chainScope) {
				if (filterMode === 'include' && hasInclude) include = includeSet.has(chainScope)
				if (filterMode === 'exclude' && hasExclude) include = !excludeSet.has(chainScope)
			} else {
				if (hasInclude || hasExclude) include = false
			}
		} else {
			if (filterMode === 'include' && hasInclude) include = includeSet.has(key)
			if (filterMode === 'exclude' && hasExclude) include = !excludeSet.has(key)
		}

		if (!include || pairs.length === 0) continue

		if (!adjustType) {
			accumulate(base, pairs)
			continue
		}

		switch (adjustType) {
			case 'doublecounted':
				accumulate(dc, pairs)
				break
			case 'liquidstaking':
				accumulate(ls, pairs)
				break
			case 'dcAndLsOverlap':
				accumulate(overlap, pairs)
				break
		}
	}

	const tsSet = new Set<number>()
	;[base, dc, ls, overlap].forEach((m) => m.forEach((_, ts) => tsSet.add(ts)))
	const allTs = Array.from(tsSet).sort((a, b) => a - b)

	const adjusted: [number, number][] = allTs.map((ts) => [
		ts,
		(base.get(ts) || 0) - (dc.get(ts) || 0) - (ls.get(ts) || 0) + (overlap.get(ts) || 0)
	])

	return filterOutToday(adjusted)
}
