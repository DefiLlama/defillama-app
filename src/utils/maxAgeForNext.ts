//:00 -> adapters start running, they take up to 15mins
//:20 -> storeProtocols starts running, sets cache expiry to :21 of next hour
//:22 -> we rebuild all pages
export function maxAgeForNext(minutesForRollover: number[] = [22]) {
	// minutesForRollover is an array of minutes in the hour that we want to revalidate
	const now = new Date()
	const currentMinute = now.getMinutes()
	const currentSecond = now.getSeconds()
	const nextMinute = minutesForRollover.find((m) => m > currentMinute) ?? Math.min(...minutesForRollover) + 60
	const maxAge = nextMinute * 60 - currentMinute * 60 - currentSecond
	return maxAge
}
