type WeightedAccumulator = { numerator: number; denominator: number }
type WeightedStore = Record<string, WeightedAccumulator>

const WEIGHTED_ACC_SYMBOL: unique symbol = Symbol('weightedAccumulators')

export const toFiniteNumber = (value: unknown): number | null => {
	if (value == null) return null
	const num = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(num) ? num : null
}

const ensureWeightedStore = (target: Record<string | symbol, any>): WeightedStore => {
	if (!target[WEIGHTED_ACC_SYMBOL]) {
		Object.defineProperty(target, WEIGHTED_ACC_SYMBOL, {
			value: {} as WeightedStore,
			enumerable: false,
			writable: true,
			configurable: true
		})
	}

	return target[WEIGHTED_ACC_SYMBOL] as WeightedStore
}

export const applyWeightedChange = (
	target: Record<string | symbol, any>,
	key: string,
	weight: unknown,
	change: unknown
) => {
	const numericChange = toFiniteNumber(change)
	const numericWeight = toFiniteNumber(weight)
	if (numericChange === null || numericWeight === null || numericWeight <= 0) return

	const store = ensureWeightedStore(target)
	const accumulator = store[key] ?? { numerator: 0, denominator: 0 }
	accumulator.numerator += numericChange * numericWeight
	accumulator.denominator += numericWeight
	store[key] = accumulator
	target[key] = accumulator.denominator > 0 ? accumulator.numerator / accumulator.denominator : undefined
}

export const finalizeAggregatedProtocol = <T extends Record<string | symbol, any>>(entry: T): T => {
	const result: Record<string | symbol, any> = { ...entry }
	const store = entry[WEIGHTED_ACC_SYMBOL] as WeightedStore | undefined

	if (store) {
		for (const key in store) {
			const accumulator = store[key]
			result[key] = accumulator.denominator > 0 ? accumulator.numerator / accumulator.denominator : undefined
		}
		delete result[WEIGHTED_ACC_SYMBOL]
	}

	return result as T
}
