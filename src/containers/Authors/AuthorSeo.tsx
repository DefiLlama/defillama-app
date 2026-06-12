import Head from 'next/head'
import type { AuthorStats, PublicDashboardAuthor } from './types'

const SITE_ORIGIN = 'https://defillama.com'

function isSafeHttpsUrl(value: string): boolean {
	try {
		const url = new URL(value)
		return url.protocol === 'https:' && !url.username && !url.password
	} catch {
		return false
	}
}

function safeSameAs(author: PublicDashboardAuthor): string[] {
	return Object.values(author.socials || {}).filter(
		(value): value is string => typeof value === 'string' && isSafeHttpsUrl(value)
	)
}

export function buildAuthorJsonLd(
	author: PublicDashboardAuthor,
	stats: AuthorStats,
	totalDashboards: number
): Record<string, unknown>[] {
	const url = `${SITE_ORIGIN}/authors/${author.slug}`
	const sameAs = safeSameAs(author)
	const avatarUrl = author.avatarUrl && isSafeHttpsUrl(author.avatarUrl) ? author.avatarUrl : null

	return [
		{
			'@context': 'https://schema.org',
			'@type': 'ProfilePage',
			'@id': `${url}#webpage`,
			url,
			name: `${author.displayName} - DefiLlama Dashboard Author`,
			...(author.createdAt ? { dateCreated: author.createdAt } : {}),
			...(author.updatedAt ? { dateModified: author.updatedAt } : {}),
			mainEntity: {
				'@type': 'Person',
				'@id': `${url}#person`,
				name: author.displayName,
				url,
				...(author.bio ? { description: author.bio } : {}),
				...(avatarUrl ? { image: avatarUrl } : {}),
				...(sameAs.length ? { sameAs } : {}),
				interactionStatistic: [
					{
						'@type': 'InteractionCounter',
						interactionType: 'https://schema.org/FollowAction',
						userInteractionCount: stats.followerCount
					},
					{
						'@type': 'InteractionCounter',
						interactionType: 'https://schema.org/LikeAction',
						userInteractionCount: stats.totalLikes
					}
				],
				agentInteractionStatistic: {
					'@type': 'InteractionCounter',
					interactionType: 'https://schema.org/WriteAction',
					userInteractionCount: totalDashboards
				}
			}
		},
		{
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'DefiLlama Pro Dashboards', item: `${SITE_ORIGIN}/pro` },
				{ '@type': 'ListItem', position: 2, name: author.displayName, item: url }
			]
		}
	]
}

export function AuthorOgImage({ author }: { author: PublicDashboardAuthor }) {
	if (!author.avatarUrl || !isSafeHttpsUrl(author.avatarUrl)) return null
	return (
		<Head>
			<meta key="og:image" property="og:image" content={author.avatarUrl} />
			<meta key="og:image:alt" property="og:image:alt" content={`${author.displayName} avatar`} />
			<meta key="twitter:image" name="twitter:image" content={author.avatarUrl} />
		</Head>
	)
}
