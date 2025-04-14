export function stringToColour() {
	return '#' + ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, '0')
}

export function getUtcDateObject(date: number): string {
	return new Date(new Date(date * 1000).toString().slice(0, -4)) as unknown as string
}

export const lastDayOfMonth = (dateString) => {
	let date = new Date(dateString)

	return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}
