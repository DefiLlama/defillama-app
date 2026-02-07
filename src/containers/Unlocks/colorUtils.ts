export const interpolateColor = (rgb1: number[], rgb2: number[], factor: number): number[] => {
	const result = rgb1.slice()
	for (let i = 0; i < 3; i++) {
		result[i] = Math.round(result[i] + factor * 1.2 * (rgb2[i] - rgb1[i]))
	}
	return result
}
