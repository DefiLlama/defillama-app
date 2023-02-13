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
}

export interface IArticlesResponse {
	type: string
	version: string
	content_elements: IContentElement[]
}

function getDSLQuery({ tags = '' }) {
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
			term: {
				'taxonomy.tags.text': tags.toLowerCase()
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

export const fetchArticles = async ({ tags = '', offset = 0, size = 2, sort = 'display_date:desc' }) => {
	const params = {
		body: JSON.stringify(getDSLQuery({ tags })),
		from: offset.toString(),
		size: size.toString(),
		sort,
		website: 'dlnews',
		_sourceInclude: 'credits,display_date,headlines,promo_items,publish_date,subheadlines,taxonomy,canonical_url'
	}

	const urlSearch = new URLSearchParams(params)

	const articlesRes = await fetch(`${process.env.DL_NEWS_API}/content/v4/search/published?${urlSearch.toString()}`, {
		headers: {
			'content-type': 'application/json',
			Authorization: `Bearer ${process.env.DL_NEWS_ACCESS_TOKEN}`
		},
		method: 'GET'
	})
		.then((res) => res.json())
		.catch(() => {
			return {}
		})

	const articles: IArticle[] =
		articlesRes?.content_elements?.map((element) => ({
			headline: element.headlines.basic,
			href: `https://dlnews.com${element.canonical_url}`,
			imgSrc: element.promo_items?.basic?.url ?? null
		})) ?? []

	return articles
}
