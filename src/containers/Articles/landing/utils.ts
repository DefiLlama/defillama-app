export function formatDate(value: string | null) {
	if (!value) return ''
	const date = new Date(value)
	const day = date.getDate()
	const month = date.toLocaleString('en', { month: 'short' })
	const year = date.getFullYear()
	return `${day} ${month} ${year}`
}

export const RESEARCH_LANDING_LIMITS = {
	heroReports: 9,
	latest: 6,
	spotlight: 4,
	interviews: 17,
	insights: 8,
	introducingGrid: 4,
	introducingColumn: 20,
	moreReports: 10,
	collections: 15
} as const
