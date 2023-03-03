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

export const fetchArticles = async ({ tags = '', size = 2 }) => {
	const articlesRes: IArticlesResponse = await fetchWithErrorLogging(
		`https://api.llama.fi/news/articles`
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
