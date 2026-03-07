export function normalizeError(err: unknown): Error {
	if (err instanceof Error) return err
	if (typeof err === 'string') return new Error(err)
	try {
		return new Error(JSON.stringify(err))
	} catch {
		return new Error(String(err))
	}
}

export function getErrorMessage(err: unknown): string {
	if (err instanceof Error) return err.message
	if (typeof err === 'string') return err
	try {
		return JSON.stringify(err)
	} catch {
		return String(err)
	}
}
