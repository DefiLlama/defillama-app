import type {
	ArticleChartAnnotation,
	ArticleChartConfig,
	ArticleChartEntity,
	ArticleChartRange
} from './types'

const VALID_RANGES: ReadonlySet<ArticleChartRange> = new Set(['30d', '90d', '365d', 'all'])

const MAX_ENTITIES = 4
const MAX_ANNOTATIONS = 5

function validateEntity(value: unknown): ArticleChartEntity | null {
	if (!value || typeof value !== 'object') return null
	const candidate = value as Partial<ArticleChartEntity> & Record<string, unknown>
	if (candidate.entityType !== 'protocol' && candidate.entityType !== 'chain') return null
	if (typeof candidate.slug !== 'string' || candidate.slug.trim().length === 0) return null
	const slug = candidate.slug.trim()
	const name =
		typeof candidate.name === 'string' && candidate.name.trim().length > 0 ? candidate.name.trim() : slug
	return {
		entityType: candidate.entityType,
		slug,
		name,
		...(typeof candidate.geckoId === 'string' && candidate.geckoId.trim()
			? { geckoId: candidate.geckoId.trim() }
			: {})
	}
}

function validateAnnotation(value: unknown): ArticleChartAnnotation | null {
	if (!value || typeof value !== 'object') return null
	const candidate = value as Partial<ArticleChartAnnotation>
	if (typeof candidate.date !== 'string' || !candidate.date.trim()) return null
	const ts = Date.parse(candidate.date)
	if (Number.isNaN(ts)) return null
	const label =
		typeof candidate.label === 'string' && candidate.label.trim().length > 0 ? candidate.label.trim() : ''
	if (!label) return null
	return { date: new Date(ts).toISOString(), label: label.slice(0, 80) }
}

export function validateArticleChartConfig(value: unknown): ArticleChartConfig | null {
	if (!value || typeof value !== 'object') return null
	const candidate = value as Partial<ArticleChartConfig> & Record<string, unknown>

	if (typeof candidate.chartType !== 'string' || candidate.chartType.trim().length === 0) return null

	let entities: ArticleChartEntity[] = []
	if (Array.isArray(candidate.entities)) {
		entities = candidate.entities
			.map(validateEntity)
			.filter((e): e is ArticleChartEntity => e !== null)
			.slice(0, MAX_ENTITIES)
	}
	if (entities.length === 0) return null

	const range =
		typeof candidate.range === 'string' && VALID_RANGES.has(candidate.range as ArticleChartRange)
			? (candidate.range as ArticleChartRange)
			: undefined

	const annotations = Array.isArray(candidate.annotations)
		? candidate.annotations
				.map(validateAnnotation)
				.filter((a): a is ArticleChartAnnotation => a !== null)
				.slice(0, MAX_ANNOTATIONS)
		: []

	return {
		entities,
		chartType: candidate.chartType.trim(),
		...(range ? { range } : {}),
		...(candidate.logScale === true ? { logScale: true } : {}),
		...(annotations.length > 0 ? { annotations } : {}),
		...(typeof candidate.caption === 'string' && candidate.caption.trim()
			? { caption: candidate.caption.trim() }
			: {})
	}
}
