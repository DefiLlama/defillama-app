import type { ParsedUrlQuery } from 'querystring'

export function getYieldsQuestionContext(query: ParsedUrlQuery): { filters: Record<string, any> } | null {
	const filters: Record<string, any> = {}
	let hasFilters = false

	if (query.chain) {
		const chains = Array.isArray(query.chain) ? query.chain : [query.chain]
		if (chains.length > 0 && chains[0] !== 'All') {
			filters.chains = chains
			hasFilters = true
		}
	}
	if (query.project) {
		const projects = Array.isArray(query.project) ? query.project : [query.project]
		if (projects.length > 0) {
			filters.projects = projects
			hasFilters = true
		}
	}
	if (query.token) {
		const tokens = Array.isArray(query.token) ? query.token : [query.token]
		if (tokens.length > 0) {
			filters.tokens = tokens
			hasFilters = true
		}
	}
	if (query.category) {
		const categories = Array.isArray(query.category) ? query.category : [query.category]
		if (categories.length > 0) {
			filters.categories = categories
			hasFilters = true
		}
	}
	if (query.attribute) {
		const attributes = Array.isArray(query.attribute) ? query.attribute : [query.attribute]
		if (attributes.length > 0) {
			filters.attributes = attributes
			hasFilters = true
		}
	}
	if (query.minTvl) {
		filters.minTvl = Number(query.minTvl)
		hasFilters = true
	}
	if (query.maxTvl) {
		filters.maxTvl = Number(query.maxTvl)
		hasFilters = true
	}
	if (query.minApy) {
		filters.minApy = Number(query.minApy)
		hasFilters = true
	}
	if (query.maxApy) {
		filters.maxApy = Number(query.maxApy)
		hasFilters = true
	}

	if (!hasFilters) return null
	return { filters }
}
