import { primaryColor } from '~/constants/colors'

export const getColor = async (path: string) => {
	try {
		const color = await fetch(path).then((res) => res.text())

		if (color.startsWith('404 page not')) return primaryColor

		return color
	} catch (error) {
		return primaryColor
	}
}
