export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> = T extends (
	...args: unknown[]
) => Promise<infer R>
	? R
	: unknown

function onlyUnique<T>(value: T, index: number, self: T[]) {
	return self.indexOf(value) === index
}

export const getUniqueArray = (arr: string[]) => arr.filter(onlyUnique)
