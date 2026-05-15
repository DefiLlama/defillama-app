import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getAllArticlesBanner, getArticleBanner, getSectionBanner } from '~/containers/Articles/api'
import type { ArticleSection, Banner, BannerLookupResult } from '~/containers/Articles/types'

type Props = {
	articleId: string
	section: ArticleSection | null
}

function isExternalUrl(url: string) {
	return /^https?:\/\//i.test(url)
}

export function ArticleImageBanner({ articleId, section }: Props) {
	const articleBannerQuery = useQuery<BannerLookupResult>({
		queryKey: ['research', 'banner', 'article', articleId],
		queryFn: () => getArticleBanner(articleId),
		enabled: !!articleId,
		retry: false,
		staleTime: 60_000
	})

	const sectionBannerQuery = useQuery<BannerLookupResult>({
		queryKey: ['research', 'banner', 'section', section],
		queryFn: () => getSectionBanner(section as ArticleSection),
		enabled: !!section && !!articleId && !articleBannerQuery.isLoading && !articleBannerQuery.data?.image,
		retry: false,
		staleTime: 60_000
	})

	const allArticlesBannerQuery = useQuery<BannerLookupResult>({
		queryKey: ['research', 'banner', 'all-articles'],
		queryFn: () => getAllArticlesBanner(),
		enabled:
			!!articleId &&
			!articleBannerQuery.isLoading &&
			!articleBannerQuery.data?.image &&
			!sectionBannerQuery.isLoading &&
			!sectionBannerQuery.data?.image,
		retry: false,
		staleTime: 60_000
	})

	const banner: Banner | null =
		articleBannerQuery.data?.image ?? sectionBannerQuery.data?.image ?? allArticlesBannerQuery.data?.image ?? null

	if (!banner || !banner.enabled || !banner.imageUrl) return null

	const alt = banner.imageAlt?.trim() ?? ''
	const linkUrl = banner.linkUrl?.trim() ?? ''

	const frame = (
		<div className="overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg) transition-colors hover:border-(--link-text)/40">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={banner.imageUrl} alt={alt} className="block h-auto w-full" loading="lazy" />
		</div>
	)

	if (!linkUrl) return frame

	return isExternalUrl(linkUrl) ? (
		<a href={linkUrl} target="_blank" rel="noopener noreferrer" className="block">
			{frame}
		</a>
	) : (
		<Link href={linkUrl} className="block">
			{frame}
		</Link>
	)
}
