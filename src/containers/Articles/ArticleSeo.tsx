import Head from 'next/head'
import type { ArticleAuthor, LocalArticleDocument } from './types'
import { ARTICLE_SECTION_LABELS, ARTICLE_SECTION_SLUGS } from './types'

const SITE_ORIGIN = 'https://defillama.com'

function toSafeJsonLd(data: unknown): string {
	return JSON.stringify(data).replace(/</g, '\\u003c')
}

const PUBLISHER = {
	'@context': 'https://schema.org',
	'@type': 'Organization',
	name: 'DefiLlama Research',
	url: `${SITE_ORIGIN}/research`,
	contactPoint: [
		{
			'@type': 'ContactPoint',
			email: 'research@defillama.com',
			contactType: 'General enquiries'
		}
	],
	foundingDate: '2020-10-01',
	sameAs: [
		'https://x.com/defillama_res',
		'https://t.me/defillama_research',
		'https://x.com/DefiLlama',
		'https://discord.defillama.com/'
	],
	logo: {
		'@type': 'ImageObject',
		url: 'https://defillama.com/assets/defillama-dark.webp',
		width: 389,
		height: 133
	},
	'@id': `${SITE_ORIGIN}/research`
}

export type ArticleSeoAuthor = {
	type: 'Organization' | 'Person'
	name: string
	url?: string
	id?: string
	sameAs?: string[]
}

function articleCanonicalPath(article: LocalArticleDocument): string {
	if (article.section) {
		const sectionSlug = ARTICLE_SECTION_SLUGS[article.section]
		return `/research/${sectionSlug}/${article.slug}`
	}
	return '/research'
}

export function articleCanonicalUrl(article: LocalArticleDocument): string {
	return `${SITE_ORIGIN}${articleCanonicalPath(article)}`
}

export function articleSectionCanonicalUrl(article: LocalArticleDocument): string {
	return `${SITE_ORIGIN}${`/research/${ARTICLE_SECTION_SLUGS[article.section] || ''}`}`
}

function authorProfileUrl(profile: ArticleAuthor): string {
	return `${SITE_ORIGIN}/research/authors/${profile.slug}`
}

function socialUrls(profile: ArticleAuthor): string[] {
	return Object.values(profile.socials ?? {}).filter(Boolean)
}

function defillamaResearchSeoAuthor(): ArticleSeoAuthor {
	return {
		type: 'Organization',
		id: `${SITE_ORIGIN}/research`,
		name: 'DefiLlama Research',
		url: `${SITE_ORIGIN}/research`,
		sameAs: ['https://x.com/DefiLlama', 'https://www.linkedin.com/company/defillama/']
	}
}

function personSeoAuthor(profile: ArticleAuthor): ArticleSeoAuthor {
	const url = authorProfileUrl(profile)
	return {
		type: 'Person',
		id: url,
		name: profile.displayName,
		url,
		sameAs: socialUrls(profile)
	}
}

function fallbackSeoAuthor(article: LocalArticleDocument): ArticleSeoAuthor {
	return article.author
		? {
				type: 'Person',
				name: article.author
			}
		: defillamaResearchSeoAuthor()
}

function seoAuthorKey(author: ArticleSeoAuthor): string {
	return author.url ?? `${author.type}:${author.name}`
}

export function getArticleSeoAuthors(article: LocalArticleDocument): ArticleSeoAuthor[] {
	const authors: ArticleSeoAuthor[] = []
	const seen = new Set<string>()
	const push = (author: ArticleSeoAuthor) => {
		const key = seoAuthorKey(author)
		if (seen.has(key)) return
		seen.add(key)
		authors.push(author)
	}

	if (article.brandByline === true) {
		push(defillamaResearchSeoAuthor())
	} else if (article.authorProfile) {
		push(personSeoAuthor(article.authorProfile))
	} else {
		push(fallbackSeoAuthor(article))
	}

	for (const profile of article.coAuthors ?? []) {
		push(personSeoAuthor(profile))
	}

	return authors
}

function seoAuthorToJsonLd(author: ArticleSeoAuthor): Record<string, unknown> {
	if (author.type === 'Organization') {
		return {
			'@type': 'Organization',
			...(author.id ? { '@id': author.id } : {}),
			name: author.name,
			...(author.url ? { url: author.url } : {}),
			...(author.sameAs && author.sameAs.length > 0 ? { sameAs: author.sameAs } : {})
		}
	}

	return {
		'@type': 'Person',
		...(author.id ? { '@id': author.id } : {}),
		name: author.name,
		...(author.url ? { url: author.url } : {}),
		...(author.sameAs && author.sameAs.length > 0 ? { sameAs: author.sameAs } : {}),
		worksFor: {
			'@type': 'Organization',
			name: 'DefiLlama Research'
		}
	}
}

export function getArticleOpenGraphAuthorUrls(article: LocalArticleDocument): string[] {
	return getArticleSeoAuthors(article)
		.map((author) => author.url)
		.filter((url): url is string => Boolean(url))
}

export function buildArticleJsonLd(article: LocalArticleDocument): Record<string, unknown> {
	const url = articleCanonicalUrl(article)

	const ld: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: article.title,
		name: article.title,
		mainEntityOfPage: { '@type': 'WebPage', '@id': url, name: article.title },
		url,
		author: getArticleSeoAuthors(article).map(seoAuthorToJsonLd),
		publisher: PUBLISHER,
		articleSection: article.section ? ARTICLE_SECTION_LABELS[article.section] : undefined,
		genre: 'cryptocurrency',
		keywords: (article.tags ?? []).join(', ') || undefined,
		datePublished: article.firstPublishedAt ?? article.publishedAt ?? undefined,
		dateCreated: article.createdAt,
		dateModified: article.lastPublishedAt ?? article.publishedAt ?? article.updatedAt
	}
	if (article.coverImage?.url) {
		ld.image = {
			'@type': 'ImageObject',
			url: article.coverImage.url,
			caption: article.coverImage.caption,
			...(article.coverImage.credit ? { creditText: article.coverImage.credit } : {}),
			...(article.coverImage.copyright
				? { copyrightHolder: { '@type': 'Organization', name: article.coverImage.copyright } }
				: {})
		}
	}
	if (article.seoDescription) {
		ld.description = article.seoDescription
	}
	return ld
}

function buildBreadcrumbJsonLd(article: LocalArticleDocument): Record<string, unknown> {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{
				'@type': 'ListItem',
				position: 1,
				name: 'DefiLlama Research',
				item: `${SITE_ORIGIN}/research`
			},
			{
				'@type': 'ListItem',
				position: 2,
				name: article.section ? ARTICLE_SECTION_LABELS[article.section] : 'Research',
				item: articleSectionCanonicalUrl(article)
			},
			{
				'@type': 'ListItem',
				position: 3,
				name: article.title,
				item: articleCanonicalUrl(article)
			}
		]
	}
}

export function ArticleSeo({ article }: { article: LocalArticleDocument }) {
	const titleTag = article.seoTitle || article.title
	const description = article.seoDescription
	const canonical = articleCanonicalUrl(article)
	const isPublished = article.status === 'published'
	const sectionLabel = article.section ? ARTICLE_SECTION_LABELS[article.section] : null
	const firstPublished = article.firstPublishedAt ?? article.publishedAt
	const lastPublished = article.lastPublishedAt ?? article.publishedAt
	const openGraphAuthorUrls = getArticleOpenGraphAuthorUrls(article)

	return (
		<Head>
			<title>{titleTag}</title>
			<link rel="canonical" href={canonical} />
			<link
				rel="alternate"
				type="application/rss+xml"
				title="DefiLlama Research"
				href={`${SITE_ORIGIN}/research/feed.xml`}
			/>
			<meta key="og:title" property="og:title" content={titleTag} />
			<meta key="twitter:title" name="twitter:title" content={titleTag} />
			{description ? <meta key="description" name="description" content={description} /> : null}
			{description ? <meta key="og:description" property="og:description" content={description} /> : null}
			{description ? <meta key="twitter:description" name="twitter:description" content={description} /> : null}
			<meta key="og:type" property="og:type" content="article" />
			<meta key="og:url" property="og:url" content={canonical} />
			{sectionLabel ? <meta key="article:section" property="article:section" content={sectionLabel} /> : null}
			{openGraphAuthorUrls.map((url) => (
				<meta key={`article:author:${url}`} property="article:author" content={url} />
			))}
			{(article.tags ?? []).map((tag) => (
				<meta key={`article:tag:${tag}`} property="article:tag" content={tag} />
			))}
			{firstPublished ? (
				<meta key="article:published_time" property="article:published_time" content={firstPublished} />
			) : null}
			{lastPublished ? (
				<meta key="article:modified_time" property="article:modified_time" content={lastPublished} />
			) : null}
			{article.coverImage?.url ? <meta key="og:image" property="og:image" content={article.coverImage.url} /> : null}
			{article.coverImage?.url ? (
				<meta key="twitter:image" name="twitter:image" content={article.coverImage.url} />
			) : null}
			{article.coverImage?.caption ? (
				<meta key="og:image:alt" property="og:image:alt" content={article.coverImage.caption} />
			) : null}
			{isPublished ? (
				<>
					<script
						type="application/ld+json"
						dangerouslySetInnerHTML={{ __html: toSafeJsonLd(buildArticleJsonLd(article)) }}
					/>
					<script
						type="application/ld+json"
						dangerouslySetInnerHTML={{ __html: toSafeJsonLd(buildBreadcrumbJsonLd(article)) }}
					/>
				</>
			) : null}
		</Head>
	)
}
