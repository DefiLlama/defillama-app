export function keepNeededProperties<T extends object, K extends keyof T & string>(
	protocol: T,
	propertiesToKeep: readonly K[]
): Pick<T, K>
export function keepNeededProperties(protocol: object, propertiesToKeep: readonly string[]): Record<string, unknown>
export function keepNeededProperties(protocol: object, propertiesToKeep: readonly string[]): Record<string, unknown> {
	const obj = protocol as Record<string, unknown>
	const result: Record<string, unknown> = {}
	for (const prop of propertiesToKeep) {
		if (obj[prop] !== undefined) {
			result[prop] = obj[prop]
		}
	}
	return result
}
