export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (...args: any) => Promise<infer R>
	? R
	: any

function onlyUnique(value, index, self) {
	return self.indexOf(value) === index
}

export const getUniqueArray = (arr: string[]) => arr.filter(onlyUnique)
