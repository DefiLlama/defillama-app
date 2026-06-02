import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import Head from 'next/head'
import { listArticles } from '~/containers/Articles/api'
import { ResearchFeedLanding, type ResearchFeedPreviewItem } from '~/containers/Articles/feed/ResearchFeedLanding'
import { articleHref, formatDate } from '~/containers/Articles/landing/utils'
import { RESEARCH_FEED_DESCRIPTION, RESEARCH_FEED_URL } from '~/containers/Articles/researchFeed'
import { ARTICLE_SECTION_LABELS } from '~/containers/Articles/types'
import Layout from '~/layout'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

const RESEARCH_FEED_PAGE_CACHE_CONTROL = 'public, max-age=300, s-maxage=900, stale-while-revalidate=3600'
const PREVIEW_ITEM_COUNT = 12

type ResearchFeedPageProps = {
	items: ResearchFeedPreviewItem[]
}

async function loadPreviewItems(): Promise<ResearchFeedPreviewItem[]> {
	const list = await listArticles({ sort: 'newest', limit: PREVIEW_ITEM_COUNT + 4 })
	const items: ResearchFeedPreviewItem[] = []
	for (const article of list.items) {
		if (!article.section) continue
		items.push({
			title: article.title,
			href: articleHref(article),
			sectionLabel: ARTICLE_SECTION_LABELS[article.section],
			date: formatDate(article.displayDate ?? article.publishedAt)
		})
		if (items.length >= PREVIEW_ITEM_COUNT) break
	}
	return items
}

const getServerSidePropsHandler: GetServerSideProps<ResearchFeedPageProps> = async ({ res }) => {
	let items: ResearchFeedPreviewItem[] = []

	try {
		items = await loadPreviewItems()
	} catch (error) {
		console.warn('[research/feed] failed to load preview articles', error)
	}

	res.setHeader('Cache-Control', jitterCacheControlHeader(RESEARCH_FEED_PAGE_CACHE_CONTROL, 'research/feed'))

	return {
		props: { items }
	}
}

export const getServerSideProps = withServerSidePropsTelemetry('/research/feed', getServerSidePropsHandler)

export default function ResearchFeedPage({ items }: InferGetServerSidePropsType<typeof getServerSideProps>) {
	return (
		<Layout
			title="Subscribe to DefiLlama Research — RSS Feed"
			description={RESEARCH_FEED_DESCRIPTION}
			canonicalUrl="/research/feed"
			hideDesktopSearch
		>
			<Head>
				<link rel="alternate" type="application/rss+xml" title="DefiLlama Research" href={RESEARCH_FEED_URL} />
			</Head>
			<style>{`main{padding:0}#__next{gap:0;}`}</style>
			<div className="col-span-full min-h-screen w-full">
				<ResearchFeedLanding items={items} />
			</div>
		</Layout>
	)
}
