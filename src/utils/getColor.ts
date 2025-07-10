import { primaryColor } from '~/constants/colors'
import { fetchWithErrorLogging } from './async'

export const getColor = async (path: string) => {
	try {
		if (!path) return primaryColor

		const color = await fetchWithErrorLogging(path).then((res) => res.text())

		if (!color.startsWith('#')) {
			console.log(path, color)
			return primaryColor
		}

		return color
	} catch (error) {
		console.log(path, 'rugged, but handled')
		return primaryColor
	}
}

// Get unique generated color for color fallback
export const getGeneratedColor = (index: number): string => {
	if (index === 0) return primaryColor

	// HSL-to-HEX logic
	const hue = (240 + index * 137.5) % 360
	const s = 70,
		l = 50
	const l_norm = l / 100
	const a = (s * Math.min(l_norm, 1 - l_norm)) / 100
	const f = (n: number) => {
		const k = (n + hue / 30) % 12
		const color = l_norm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
		return Math.round(255 * color)
			.toString(16)
			.padStart(2, '0')
	}
	return `#${f(0)}${f(8)}${f(4)}`
}
