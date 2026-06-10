import type { GetServerSideProps } from 'next'
import { getArticleBySlug, listArticles } from '~/containers/Articles/api'
import { buildResearchRssFeed, RESEARCH_FEED_ITEM_COUNT } from '~/containers/Articles/researchFeed'
import type { ArticleDocument } from '~/containers/Articles/types'

const RESEARCH_FEED_CACHE_CONTROL = 'public, max-age=300, s-maxage=300'
const HYDRATION_CONCURRENCY = 6

function ResearchFeed() {}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const results: R[] = new Array(items.length)
	let cursor = 0
	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (cursor < items.length) {
			const index = cursor++
			results[index] = await fn(items[index])
		}
	})
	await Promise.all(workers)
	return results
}

async function loadFeedArticles(): Promise<ArticleDocument[]> {
	const list = await listArticles({ sort: 'newest', limit: RESEARCH_FEED_ITEM_COUNT })
	return mapWithConcurrency(list.items, HYDRATION_CONCURRENCY, async (item) => {
		try {
			const full = await getArticleBySlug(item.slug)
			return full ?? item
		} catch {
			return item
		}
	})
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
	let articles: ArticleDocument[] = []

	try {
		articles = await loadFeedArticles()
	} catch (error) {
		console.warn('[research/feed] failed to load articles', error)
	}

	const feed = buildResearchRssFeed(articles)

	res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
	res.setHeader('Cache-Control', RESEARCH_FEED_CACHE_CONTROL)
	res.write(feed)
	res.end()

	return {
		props: {}
	}
}

export default ResearchFeed
