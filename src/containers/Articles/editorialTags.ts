export type EditorialTagSlug = 'spotlight' | 'latest' | 'insights' | 'report-highlight' | 'reports-hero'

export type EditorialTagCardinality = 'singleton' | 'multi'

export type EditorialTagDefinition = {
	slug: EditorialTagSlug
	label: string
	description: string
	cardinality: EditorialTagCardinality
}

export const EDITORIAL_TAGS: Record<EditorialTagSlug, EditorialTagDefinition> = {
	spotlight: {
		slug: 'spotlight',
		label: 'Spotlight',
		description: 'Curated articles featured at the top of /research.',
		cardinality: 'multi'
	},
	latest: {
		slug: 'latest',
		label: 'Latest from DefiLlama Research',
		description: 'Curated articles for the Latest from DefiLlama Research section.',
		cardinality: 'multi'
	},
	insights: {
		slug: 'insights',
		label: 'Insights',
		description: 'Curated set of analytical pieces.',
		cardinality: 'multi'
	},
	'report-highlight': {
		slug: 'report-highlight',
		label: 'Report highlight',
		description: 'Single highlighted report card.',
		cardinality: 'singleton'
	},
	'reports-hero': {
		slug: 'reports-hero',
		label: 'Reports hero',
		description: 'Curated items for the reports carousel in the hero of /research.',
		cardinality: 'multi'
	}
}

export const EDITORIAL_TAG_LIST: EditorialTagDefinition[] = Object.values(EDITORIAL_TAGS)

export function isEditorialTagSlug(value: unknown): value is EditorialTagSlug {
	return typeof value === 'string' && Object.prototype.hasOwnProperty.call(EDITORIAL_TAGS, value)
}
