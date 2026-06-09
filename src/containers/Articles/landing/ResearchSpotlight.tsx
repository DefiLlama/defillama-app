import clsx from 'clsx'
import Link from 'next/link'
import React from 'react'
import { ResearchIcon } from '~/components/ResearchIcon'
import { InViewAnalytics, pushResearchAnalyticsEvent } from '~/containers/Articles/landing/Analytics'
import { TitleLine } from '~/containers/Articles/landing/TitleLine'
import { articleHref, formatDate } from '~/containers/Articles/landing/utils'
import type { ArticleDocument } from '~/containers/Articles/types'

function getImageAspectRatio(itemsCount: number) {
	if (itemsCount === 6) return 'aspect-[167/96]'
	if (itemsCount === 5) return 'aspect-[207/118]'
	return 'aspect-[270/155]'
}

function getSpotlightGridCols(itemsCount: number) {
	if (itemsCount === 6) return 'sm:grid-cols-6'
	if (itemsCount === 5) return 'sm:grid-cols-5'
	return 'sm:grid-cols-4'
}

function SnapshotImage({ article }: Readonly<{ article: ArticleDocument }>) {
	const url = article.coverImage?.url
	if (!url) return null
	return (
		<img
			src={url}
			alt={article.coverImage.alt}
			className="h-full w-full object-cover"
			loading="lazy"
			decoding="async"
		/>
	)
}

interface ResearchSpotlightProps {
	articles: ArticleDocument[]
	title: string
}

export const ResearchSpotlight: React.FC<ResearchSpotlightProps> = ({ title, articles }) => {
	if (articles.length === 0) return null

	const count = articles.length

	return (
		<div id="spotlight">
			<div className="mb-[26px] flex items-center gap-x-[15px]">
				<ResearchIcon name="spotlight" width={32} height={32} aria-hidden />
				<TitleLine title={title} />
			</div>
			<div className={clsx('grid grid-cols-1 gap-[12px] lg:gap-[28px]', getSpotlightGridCols(count))}>
				{articles.map((article, i) => (
					<Link
						key={article.id}
						className="group relative top-0 transition-all duration-200 ease-out hover:top-[-4px]"
						href={articleHref(article)}
						onClick={() => pushResearchAnalyticsEvent(article, 'widget_click', 'DefiLlama Research Spotlight widget')}
					>
						<div
							className={clsx(
								'relative overflow-hidden rounded-[7.2px] group-hover:brightness-[0.8] lg:min-w-[40%]',
								getImageAspectRatio(count)
							)}
						>
							<ResearchIcon
								name="spotlight-badge"
								className="absolute top-[8px] left-[8px] z-[1]"
								width={43}
								height={35}
								aria-hidden
							/>
							<SnapshotImage article={article} />
						</div>
						{i === 0 && (
							<InViewAnalytics eventParams={[article, 'widget_impression', 'DefiLlama Research Spotlight widget']} />
						)}
						<div className="flex grow flex-col py-[16px]">
							<div
								className={clsx(
									'font-semibold text-[#0d1e3b] group-hover:text-[#0c2956] group-hover:opacity-70 dark:text-white dark:group-hover:text-white/70',
									count === 5 || count === 6
										? 'line-clamp-4 text-[16px] leading-[120%]'
										: 'line-clamp-3 text-[16px] leading-[150%] lg:text-[18px]'
								)}
							>
								{article.title}
							</div>
							<time className="mt-[10px] hidden text-[14px] font-medium text-[#787878] lg:block dark:text-white">
								{formatDate(article.displayDate ?? article.publishedAt)}
							</time>
						</div>
					</Link>
				))}
			</div>
		</div>
	)
}
