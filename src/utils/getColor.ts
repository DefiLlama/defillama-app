import { primaryColor } from '~/constants/colors'
import { fetchJson } from './async'

export const getColor = async (path: string) => {
	try {
		if (!path) return primaryColor

		const color = await fetchJson(path)

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
