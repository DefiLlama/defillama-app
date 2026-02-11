export function keepNeededProperties<T extends object, K extends keyof T>(
	protocol: T,
	propertiesToKeep: readonly K[]
): Pick<T, K>
export function keepNeededProperties(protocol: object, propertiesToKeep: string[]): Record<string, unknown>
export function keepNeededProperties(protocol: object, propertiesToKeep: readonly string[]): Record<string, unknown> {
	return propertiesToKeep.reduce(
		(obj, prop) => {
			if ((protocol as Record<string, unknown>)[prop] !== undefined) {
				obj[prop] = (protocol as Record<string, unknown>)[prop]
			}
			return obj
		},
		{} as Record<string, unknown>
	)
}
