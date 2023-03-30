import { primaryColor } from '~/constants/colors'

export const getColor = async (path: string) => {
	try {
		const color = await fetch(path).then((res) => res.text())

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
