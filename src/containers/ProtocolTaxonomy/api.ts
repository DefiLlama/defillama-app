import { SERVER_URL } from '~/constants'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import type { CategoriesSummaryResponse, CategoryOrTagChartResponse } from './api.types'

const CATEGORY_API_URL = `${SERVER_URL}/categories`
const CATEGORY_CHART_API_URL = `${SERVER_URL}/charts/categories`
const TAGS_CHART_API_URL = `${SERVER_URL}/charts/tags`

export async function fetchCategoriesSummary(): Promise<CategoriesSummaryResponse> {
	return fetchJson<CategoriesSummaryResponse>(CATEGORY_API_URL)
}

export async function fetchCategoryChart({
	category,
	chain
}: {
	category: string
	chain?: string
}): Promise<CategoryOrTagChartResponse> {
	return fetchJson<CategoryOrTagChartResponse>(
		`${CATEGORY_CHART_API_URL}/${slug(category)}${chain ? `/${slug(chain)}` : ''}`
	)
}

export async function fetchTagChart({
	tag,
	chain
}: {
	tag: string
	chain?: string
}): Promise<CategoryOrTagChartResponse> {
	return fetchJson<CategoryOrTagChartResponse>(`${TAGS_CHART_API_URL}/${slug(tag)}${chain ? `/${slug(chain)}` : ''}`)
}
