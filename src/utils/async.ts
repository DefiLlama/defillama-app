export function withErrorLogging<T extends any[], R>(
	fn: (...args: T) => Promise<R>,
	note?: string
): (...args: T) => Promise<R> {
	return async (...args: T) => {
		try {
			return await fn(...args)
		} catch (error) {
			const name = fn.name || 'unknown function'
			const message = (note ? `Error ${note}: ` : `Error: `) + JSON.stringify(args) + ` in ${name}`
			console.error(message)
			throw error
		}
	}
}
