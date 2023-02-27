import { fetchWithErrorLogging } from '~/utils/async'

export interface IArticle {
	headline: string
	href: string
	imgSrc: string | null
}

interface ICredit {
	by: string
}

export interface IContentElement {
	subheadlines: { basic: string }
	type: string
	promo_items: { basic: { url: string } }
	canonical_url: string
	display_date: string
	credits: ICredit[]
	headlines: { basic: string }
	taxonomy?: {
		tags?: {
			description: string
			text: string
			slug: string
		}[]
	}
}

export interface IArticlesResponse {
	type: string
	version: string
	content_elements: IContentElement[]
}

function getDSLQuery() {
	const conditions = [
		{
			term: {
				'revision.published': 1
			}
		},
		{
			term: {
				type: 'story'
			}
		},
		{
			match_phrase: {
				subtype: `"article"`
			}
		},
		{
			range: {
				display_date: {
					gte: 'now-6M/d', // last 6 months
					lte: 'now'
				}
			}
		}
	]

	return {
		query: {
			bool: {
				must: conditions
			}
		}
	}
}

export const fetchArticles = async ({ tags = '', size = 2, sort = 'display_date:desc' }) => {
	const params = {
		body: JSON.stringify(getDSLQuery()),
		from: '0',
		size: '100',
		sort,
		website: 'dlnews',
		_sourceInclude: 'credits,display_date,headlines,promo_items,publish_date,subheadlines,taxonomy,canonical_url'
	}

	const urlSearch = new URLSearchParams(params)

	const articlesRes: IArticlesResponse = await fetchWithErrorLogging(
		`${process.env.DL_NEWS_API}/content/v4/search/published?${urlSearch.toString()}`,
		{
			headers: {
				'content-type': 'application/json',
				Authorization: `Bearer ${process.env.DL_NEWS_ACCESS_TOKEN}`
			},
			method: 'GET'
		}
	)
		.then((res) => res.json())
		.catch((err) => {
			console.log(err)
			return {}
		})

	const target = tags.toLowerCase()

	const articles: IArticle[] =
		articlesRes?.content_elements
			?.filter((element) => element.taxonomy?.tags?.some((tag) => tag.text.toLowerCase() === target))
			.map((element) => ({
				headline: element.headlines.basic,
				href: `https://dlnews.com${element.canonical_url}`,
				imgSrc: element.promo_items?.basic?.url ?? null
			})) ?? []

	return articles.slice(0, size)
}
