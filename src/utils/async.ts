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

export async function fetchWithThrows(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
	const res = await fetch(input, init)
	if (res.status >= 400) {
		throw new Error(`HTTP Error: ${res.status} via ${res.url}`)
	}
	return res
}
