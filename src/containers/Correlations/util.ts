export function pearsonCorrelationCoefficient(array1: number[], array2: number[]) {
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
	const den = Math.sqrt((sum1Sq - sum1 ** 2 / n) * (sum2Sq - sum2 ** 2 / n))

	if (den === 0) {
		return 0
	}

	return (num / den).toFixed(2)
}
