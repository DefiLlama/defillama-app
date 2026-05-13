import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getArticleBanner, getSectionBanner } from '~/containers/Articles/api'
import type { ArticleSection, Banner, BannerLookupResult } from '~/containers/Articles/types'
import { useAuthContext } from '~/containers/Subscription/auth'

type Props = {
	articleId: string
	section: ArticleSection | null
}

function isExternalUrl(url: string) {
	return /^https?:\/\//i.test(url)
}

export function ArticleImageBannerHorizontal({ articleId, section }: Props) {
	const { authorizedFetch, isAuthenticated, loaders } = useAuthContext()

	const articleBannerQuery = useQuery<BannerLookupResult>({
		queryKey: ['research', 'banner', 'article', articleId],
		queryFn: () => getArticleBanner(articleId, authorizedFetch),
		enabled: !!articleId && isAuthenticated && !loaders.userLoading,
		retry: false,
		staleTime: 60_000
	})

	const sectionBannerQuery = useQuery<BannerLookupResult>({
		queryKey: ['research', 'banner', 'section', section],
		queryFn: () => getSectionBanner(section as ArticleSection, authorizedFetch),
		enabled:
			!!section &&
			!!articleId &&
			isAuthenticated &&
			!loaders.userLoading &&
			!articleBannerQuery.isLoading &&
			!articleBannerQuery.data?.imageHorizontal,
		retry: false,
		staleTime: 60_000
	})

	const banner: Banner | null =
		articleBannerQuery.data?.imageHorizontal ?? sectionBannerQuery.data?.imageHorizontal ?? null

	if (!banner || !banner.enabled || !banner.imageUrl) return null

	const alt = banner.imageAlt?.trim() ?? ''
	const linkUrl = banner.linkUrl?.trim() ?? ''

	const frame = (
		<div className="overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg) transition-colors hover:border-(--link-text)/40">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={banner.imageUrl} alt={alt} className="block h-auto w-full" loading="lazy" />
		</div>
	)

	const content = !linkUrl ? (
		frame
	) : isExternalUrl(linkUrl) ? (
		<a href={linkUrl} target="_blank" rel="noopener noreferrer" className="block">
			{frame}
		</a>
	) : (
		<Link href={linkUrl} className="block">
			{frame}
		</Link>
	)

	return <div className="my-6 not-prose lg:hidden">{content}</div>
}
