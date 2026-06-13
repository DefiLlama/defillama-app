export const PAGE_DATA_RESULT_TTL_MS = 10 * 60 * 1000
export const MARKETS_CACHE_CONTROL = 'public, max-age=60, s-maxage=300, stale-while-revalidate=300'

export function isHttpNotFoundMessage(error: unknown): boolean {
	return error instanceof Error && /\b404\b/.test(error.message)
}
