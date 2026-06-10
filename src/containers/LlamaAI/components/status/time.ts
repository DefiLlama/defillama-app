export function formatTime(seconds: number): string {
	const normalizedSeconds = Math.max(0, Math.floor(seconds))
	const minutes = Math.floor(normalizedSeconds / 60)
	const remainder = normalizedSeconds % 60
	return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`
}
