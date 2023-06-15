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
		console.log(path, error)
		return primaryColor
	}
}
