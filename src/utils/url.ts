export const safeInternalPath = (raw: unknown): string | undefined => {
	if (typeof raw !== 'string') return undefined
	try {
		const decoded = decodeURIComponent(raw)
		if (/^\/(?!\/)/.test(decoded)) return decoded
	} catch {}
	return undefined
}
