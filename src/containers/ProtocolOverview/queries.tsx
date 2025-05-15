import { darken, transparentize } from 'polished'
import { tokenIconPaletteUrl } from '~/utils'
import { primaryColor } from '~/constants/colors'
import { fetchWithErrorLogging } from '~/utils/async'

export const getProtocolPageStyles = async (protocol: string) => {
	const bgColor = await getColor(tokenIconPaletteUrl(protocol))

	const bgColor2 = bgColor.length < 7 ? '#1f67d2' : bgColor
	const backgroundColor = isDarkColor(bgColor2) ? '#1f67d2' : bgColor2

	return getStyles(backgroundColor)
}

function getStyles(color: string) {
	let color2 = color.length < 7 ? '#1f67d2' : color

	let finalColor = isDarkColor(color2) ? '#1f67d2' : color2

	return {
		'--primary-color': finalColor,
		'--bg-color': transparentize(0.6, finalColor),
		'--btn-bg': transparentize(0.9, finalColor),
		'--btn-hover-bg': transparentize(0.8, finalColor),
		'--btn-text': darken(0.1, finalColor)
	}
}

function isDarkColor(color: string) {
	// Convert hex to RGB
	const hex = color.replace('#', '')
	const r = parseInt(hex.substring(0, 2), 16)
	const g = parseInt(hex.substring(2, 4), 16)
	const b = parseInt(hex.substring(4, 6), 16)

	// Calculate relative luminance
	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)

	// Calculate saturation (0-1)
	const saturation = max === 0 ? 0 : (max - min) / max

	// Check if the color is grayish by comparing RGB components and saturation
	const tolerance = 15 // RGB difference tolerance
	const saturationThreshold = 0.15 // Colors with saturation below this are considered grayish

	const isGrayish =
		Math.abs(r - g) <= tolerance &&
		Math.abs(g - b) <= tolerance &&
		Math.abs(r - b) <= tolerance &&
		saturation <= saturationThreshold

	return isGrayish
}

const getColor = async (path: string) => {
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
