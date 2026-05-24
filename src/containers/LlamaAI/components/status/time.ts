export function formatTime(seconds: number) {
	const minutes = Math.floor(seconds / 60)
	const remainder = seconds % 60
	return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`
}
