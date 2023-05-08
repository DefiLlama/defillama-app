export function stringToColour() {
	return '#' + ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, '0')
}

export function getUtcDateObject(date: number): string {
	return new Date(new Date(date * 1000).toUTCString().slice(0, -4)) as unknown as string
}
