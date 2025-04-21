export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (...args: any) => Promise<infer R>
	? R
	: any

function onlyUnique(value, index, self) {
	return self.indexOf(value) === index
}

export const getCleanMonthTimestamp = (timestampInSeconds: number) => {
	const date = new Date(timestampInSeconds * 1000)

	date.setDate(1)
	date.setHours(0)
	date.setSeconds(0)
	date.setMilliseconds(0)

	return date.getTime() / 1000
}

export const getCleanWeekTimestamp = (timestampInSeconds: number) => {
	const date = new Date(timestampInSeconds * 1000)
	const weekDay = date.getUTCDay() === 0 ? 7 : date.getUTCDay()
	const monthDay = date.getUTCDate() - weekDay
	return Math.trunc(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), monthDay) / 1000)
}

export const getUniqueArray = (arr: string[]) => arr.filter(onlyUnique)
