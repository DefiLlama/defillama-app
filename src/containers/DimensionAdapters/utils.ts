export type AsyncReturnType<T extends (...args: any[]) => Promise<any>> = T extends (...args: any[]) => Promise<infer R>
	? R
	: never

function onlyUnique<T>(value: T, index: number, self: T[]) {
	return self.indexOf(value) === index
}

export const getUniqueArray = (arr: string[]) => arr.filter(onlyUnique)
