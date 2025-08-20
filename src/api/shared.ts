export function keepNeededProperties(protocol: object, propertiesToKeep: string[]): any {
	return propertiesToKeep.reduce((obj, prop) => {
		if (protocol[prop] !== undefined) {
			obj[prop] = protocol[prop]
		}
		return obj
	}, {})
}
