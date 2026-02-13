/**
 * Correlation helpers for aligned price series:
 * - `toPairedLogReturns` builds synchronized log-return vectors from two aligned price arrays,
 *   skipping any interval where either series has a non-positive price.
 * - `pearsonCorrelationCoefficient` computes Pearson r on those vectors and returns `null`
 *   when correlation is undefined (mismatched lengths, too few points, or zero variance).
 * - `toLogReturns` is the single-series variant used when only one return vector is needed.
 */
export function pearsonCorrelationCoefficient(array1: number[], array2: number[]): number | null {
	if (array1.length !== array2.length || array1.length < 2) return null
	const n = array1.length
	let sum1 = 0
	let sum2 = 0
	let sum1Sq = 0
	let sum2Sq = 0
	let pSum = 0

	for (let i = 0; i < n; i++) {
		sum1 += array1[i]
		sum2 += array2[i]
		sum1Sq += array1[i] ** 2
		sum2Sq += array2[i] ** 2
		pSum += array1[i] * array2[i]
	}

	const num = pSum - (sum1 * sum2) / n
	const variance1 = sum1Sq - sum1 ** 2 / n
	const variance2 = sum2Sq - sum2 ** 2 / n

	if (variance1 <= 0 || variance2 <= 0) return null
	const den = Math.sqrt(variance1 * variance2)
	if (!Number.isFinite(den) || den === 0) return null

	const correlation = num / den
	return Number.isFinite(correlation) ? correlation : null
}

export function toPairedLogReturns(prices0: number[], prices1: number[]) {
	if (prices0.length !== prices1.length || prices0.length < 2) {
		return { returns0: [] as number[], returns1: [] as number[] }
	}

	const returns0: number[] = []
	const returns1: number[] = []

	for (let i = 1; i < prices0.length; i++) {
		const prev0 = prices0[i - 1]
		const curr0 = prices0[i]
		const prev1 = prices1[i - 1]
		const curr1 = prices1[i]
		if (prev0 <= 0 || curr0 <= 0 || prev1 <= 0 || curr1 <= 0) continue
		returns0.push(Math.log(curr0 / prev0))
		returns1.push(Math.log(curr1 / prev1))
	}

	return { returns0, returns1 }
}

function toLogReturns(prices: number[]) {
	if (prices.length < 2) return []
	const returns: number[] = []

	for (let i = 1; i < prices.length; i++) {
		const prev = prices[i - 1]
		const curr = prices[i]
		if (prev <= 0 || curr <= 0) continue
		returns.push(Math.log(curr / prev))
	}

	return returns
}
