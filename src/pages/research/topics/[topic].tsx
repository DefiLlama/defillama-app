import { useQuery } from '@tanstack/react-query'
import type { GetStaticPaths, GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import Error from 'next/error'
import Link from 'next/link'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { ArticleApiError, listArticlesByTopic } from '~/containers/Articles/api'
import type { ArticleListResponse } from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { GenericCard } from '~/containers/Articles/landing/GenericCard'
import { ResearchLoader } from '~/containers/Articles/ResearchLoader'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

type TopicRouteParams = {
	topic: string
}

type TopicLandingPageProps = {
	topic: string
	initialArticles: ArticleListResponse
}

const MIN_TOPIC_ARTICLE_COUNT = 4

function normalizeTopicSlug(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 120)
}

function humanizeTopic(topic: string) {
	return topic.replace(/-/g, ' ')
}

export const getStaticPaths: GetStaticPaths<TopicRouteParams> = async () => {
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	return {
		paths: [],
		fallback: 'blocking'
	}
}

export const getStaticProps = withPerformanceLogging<TopicLandingPageProps, TopicRouteParams>(
	'research/topics/[topic]',
	async ({ params }: GetStaticPropsContext<TopicRouteParams>) => {
		const topicParam = params?.topic
		if (!topicParam) {
			return {
				notFound: true,
				revalidate: maxAgeForNext([22])
			}
		}

		const topic = normalizeTopicSlug(decodeURIComponent(topicParam))
		if (!topic) {
			return {
				notFound: true,
				revalidate: maxAgeForNext([22])
			}
		}

		const canonicalParam = decodeURIComponent(topicParam).trim()
		if (canonicalParam !== topic && normalizeTopicSlug(canonicalParam) === topic) {
			return {
				redirect: {
					destination: `/research/topics/${encodeURIComponent(topic)}`,
					permanent: true
				}
			}
		}

		const initialArticles = await listArticlesByTopic(topic, { sort: 'newest', limit: 60 })
		if (initialArticles.totalItems < MIN_TOPIC_ARTICLE_COUNT) {
			return {
				notFound: true,
				revalidate: maxAgeForNext([22])
			}
		}

		return {
			props: {
				topic,
				initialArticles
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

function TopicLandingContent({ topic, initialArticles }: { topic: string; initialArticles: ArticleListResponse }) {
	const topicLabel = humanizeTopic(topic)
	const { data, isLoading, error } = useQuery({
		queryKey: ['research', 'topic-index', topic],
		queryFn: () => listArticlesByTopic(topic, { sort: 'newest', limit: 60 }),
		initialData: initialArticles,
		retry: false,
		staleTime: 60_000
	})

	if (isLoading) return <ResearchLoader />

	if (error) {
		const message = error instanceof ArticleApiError ? error.message : 'Failed to load research'
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-red-500/30 bg-red-500/5 p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Couldn't load this topic</h1>
				<p className="text-sm text-(--text-secondary)">{message}</p>
			</div>
		)
	}

	const items = data?.items ?? []
	const total = data?.totalItems ?? items.length

	if (total < MIN_TOPIC_ARTICLE_COUNT) {
		return <Error statusCode={404} />
	}

	return (
		<div className="mx-auto grid w-full max-w-[1180px] gap-8 px-4 pt-8 pb-24 sm:px-6">
			<header className="grid gap-3 border-b border-(--cards-border) pb-6">
				<div className="flex items-center justify-between gap-3">
					<Link
						href="/research"
						className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase hover:text-(--link-text)"
					>
						← All research
					</Link>
					<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase tabular-nums">
						{total} {total === 1 ? 'story' : 'stories'}
					</span>
				</div>
				<h1 className="text-3xl leading-tight font-bold tracking-tight text-(--text-primary) capitalize sm:text-4xl">
					{topicLabel}
				</h1>
			</header>

			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{items.map((article) => (
					<GenericCard key={article.id} article={article} />
				))}
			</div>
		</div>
	)
}

export default function TopicLandingPage({ topic, initialArticles }: InferGetStaticPropsType<typeof getStaticProps>) {
	const canonical = `/research/topics/${topic}`
	const topicLabel = humanizeTopic(topic)

	return (
		<Layout
			title={`${topicLabel} — DefiLlama Research`}
			description={`Research tagged with ${topicLabel}.`}
			canonicalUrl={canonical}
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<TopicLandingContent topic={topic} initialArticles={initialArticles} />
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
