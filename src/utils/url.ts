import { ParsedUrlQuery } from 'querystring'

export const safeInternalPath = (raw: unknown): string | undefined => {
	if (typeof raw !== 'string') return undefined
	try {
		const decoded = decodeURIComponent(raw)
		if (/^\/(?!\/)/.test(decoded)) return decoded
	} catch {}
	return undefined
}

export const getQueryValue = (query: ParsedUrlQuery, key: string): string | null => {
	const value = query[key]

	if (!value) return null

	if (Array.isArray(value)) {
		return value[0]
	}

	return value as string
}
