export function keepNeededProperties(protocol: any, propertiesToKeep: string[]) {
	return propertiesToKeep.reduce((obj, prop) => {
		if (protocol[prop] !== undefined) {
			obj[prop] = protocol[prop]
		}
		return obj
	}, {})
}
