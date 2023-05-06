import { fetchWithErrorLogging } from '~/utils/async'

export interface IArticle {
	headline: string
	date: string
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

export const fetchArticles = async ({ tags = '', size = 2 }) => {
	const startTime = Date.now()

	const articlesRes: IArticlesResponse = await fetchWithErrorLogging(`https://api.llama.fi/news/articles`)
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
				date: element.display_date,
				href: `https://dlnews.com${element.canonical_url}`,
				imgSrc: element.promo_items?.basic?.url ?? null
			})) ?? []

	if (Date.now() - startTime > 5_000) {
		console.log('done fetching', tags, 'in', Date.now() - startTime)
	}

	return articles.slice(0, size)
}
