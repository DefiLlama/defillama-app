export type EditorialTagSlug = 'spotlight' | 'insights'

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
		description: 'Lead article featured at the top of /research.',
		cardinality: 'singleton'
	},
	insights: {
		slug: 'insights',
		label: 'Insights',
		description: 'Curated set of analytical pieces.',
		cardinality: 'multi'
	}
}

export const EDITORIAL_TAG_LIST: EditorialTagDefinition[] = Object.values(EDITORIAL_TAGS)

export function isEditorialTagSlug(value: unknown): value is EditorialTagSlug {
	return typeof value === 'string' && Object.prototype.hasOwnProperty.call(EDITORIAL_TAGS, value)
}
