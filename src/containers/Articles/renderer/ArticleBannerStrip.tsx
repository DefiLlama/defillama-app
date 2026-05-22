import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Icon } from '~/components/Icon'
import { getAllArticlesBanner, getArticleBanner, getLandingBanner, getSectionBanner } from '~/containers/Articles/api'
import type { ArticleSection, Banner, BannerLookupResult } from '~/containers/Articles/types'

type Props = {
	scope: 'landing' | 'section' | 'article'
	section?: ArticleSection | null
	articleId?: string | null
	initialData?: ArticleBannerStripInitialData | null
}

export type ArticleBannerStripInitialData = {
	article?: BannerLookupResult | null
	section?: BannerLookupResult | null
	allArticles?: BannerLookupResult | null
	landing?: BannerLookupResult | null
}

const DISMISSED_KEY_PREFIX = 'research-banner-dismissed:'

function isExternalUrl(url: string) {
	return /^https?:\/\//i.test(url)
}

export function ArticleBannerStrip({ scope, section, articleId, initialData }: Props) {
	const articleBannerQuery = useQuery<BannerLookupResult>({
		queryKey: ['research', 'banner', 'article', articleId],
		queryFn: () => getArticleBanner(articleId as string),
		enabled: scope === 'article' && !!articleId,
		initialData: scope === 'article' ? (initialData?.article ?? undefined) : undefined,
		retry: false,
		staleTime: 60_000
	})

	const sectionSlug = scope === 'section' ? section : scope === 'article' ? section : null
	const sectionEnabled =
		scope === 'section'
			? !!section
			: scope === 'article'
				? !!section && !articleBannerQuery.isLoading && !articleBannerQuery.data?.text
				: false

	const sectionBannerQuery = useQuery<BannerLookupResult>({
		queryKey: ['research', 'banner', 'section', sectionSlug],
		queryFn: () => getSectionBanner(sectionSlug as ArticleSection),
		enabled: sectionEnabled,
		initialData: sectionSlug ? (initialData?.section ?? undefined) : undefined,
		retry: false,
		staleTime: 60_000
	})

	const allArticlesEnabled =
		scope === 'article' &&
		!!articleId &&
		!articleBannerQuery.isLoading &&
		!articleBannerQuery.data?.text &&
		!sectionBannerQuery.isLoading &&
		!sectionBannerQuery.data?.text

	const allArticlesBannerQuery = useQuery<BannerLookupResult>({
		queryKey: ['research', 'banner', 'all-articles'],
		queryFn: () => getAllArticlesBanner(),
		enabled: allArticlesEnabled,
		initialData: scope === 'article' ? (initialData?.allArticles ?? undefined) : undefined,
		retry: false,
		staleTime: 60_000
	})

	const landingBannerQuery = useQuery<BannerLookupResult>({
		queryKey: ['research', 'banner', 'landing'],
		queryFn: () => getLandingBanner(),
		enabled: scope === 'landing',
		initialData: scope === 'landing' ? (initialData?.landing ?? undefined) : undefined,
		retry: false,
		staleTime: 60_000
	})

	const banner: Banner | null =
		scope === 'article'
			? (articleBannerQuery.data?.text ?? sectionBannerQuery.data?.text ?? allArticlesBannerQuery.data?.text ?? null)
			: scope === 'section'
				? (sectionBannerQuery.data?.text ?? null)
				: (landingBannerQuery.data?.text ?? null)

	const [dismissed, setDismissed] = useState(false)
	const bannerId = banner?.id

	useEffect(() => {
		setDismissed(false)
		if (typeof window === 'undefined' || !bannerId) return
		try {
			if (window.localStorage.getItem(DISMISSED_KEY_PREFIX + bannerId)) {
				setDismissed(true)
			}
		} catch {}
	}, [bannerId])

	if (!banner || !banner.enabled || dismissed) return null

	const dismiss = () => {
		setDismissed(true)
		if (typeof window === 'undefined') return
		try {
			window.localStorage.setItem(DISMISSED_KEY_PREFIX + banner.id, '1')
		} catch {}
	}

	const linkLabel = banner.linkLabel?.trim() || 'Read more'
	const linkUrl = banner.linkUrl?.trim() || ''
	const hasLink = !!linkUrl

	return (
		<div className="flex w-full items-center gap-3 bg-[#0b1e6b] px-4 py-2.5 text-white">
			<div className="flex flex-1 items-center justify-center">
				<p className="m-0 text-center font-jetbrains text-[11px] font-semibold tracking-[0.18em] uppercase">
					<span>{banner.text}</span>
					{hasLink ? (
						<>
							{' '}
							{isExternalUrl(linkUrl) ? (
								<a
									href={linkUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 underline underline-offset-2 transition-opacity hover:opacity-80"
								>
									{linkLabel}
									<Icon name="arrow-up-right" height={10} width={10} />
								</a>
							) : (
								<Link
									href={linkUrl}
									className="inline-flex items-center gap-1 underline underline-offset-2 transition-opacity hover:opacity-80"
								>
									{linkLabel}
								</Link>
							)}
						</>
					) : null}
				</p>
			</div>
			<button
				type="button"
				onClick={dismiss}
				aria-label="Dismiss banner"
				className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
			>
				<Icon name="x" height={14} width={14} />
			</button>
		</div>
	)
}
