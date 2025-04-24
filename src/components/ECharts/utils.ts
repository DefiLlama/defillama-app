export function stringToColour() {
	return '#' + ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, '0')
}

export const lastDayOfMonth = (dateString) => {
	let date = new Date(dateString)

	return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}
