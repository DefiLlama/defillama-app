import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { InViewAnalytics, pushResearchAnalyticsEvent } from '~/containers/Articles/landing/Analytics'
import { useSharedHeight } from '~/containers/Articles/landing/ResearchSectionWithSharedHeight'
import { TitleLine } from '~/containers/Articles/landing/TitleLine'
import { formatDate } from '~/containers/Articles/landing/utils'
import type { ArticleDocument } from '~/containers/Articles/types'

interface ResearchIntroducingProps {
	title: string
	articles: ArticleDocument[]
	sharedHeight?: number
}

const DEFAULT_CONTAINER_HEIGHT = 'h-[calc(105px_*_4_+_12px_*_3)]'
const DEFAULT_DESKTOP_HEIGHT = 'lg:h-[calc(93px_*_5_+_24px_*_4)]'

export function ResearchIntroducing({ title, articles, sharedHeight }: ResearchIntroducingProps) {
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (containerRef.current && sharedHeight) {
			containerRef.current.style.setProperty('--shared-height', `${sharedHeight}px`)
		}
	}, [sharedHeight])

	const containerHeight = sharedHeight
		? `${DEFAULT_CONTAINER_HEIGHT} lg:h-[var(--shared-height,_calc(93px_*_5_+_24px_*_4))]`
		: `${DEFAULT_CONTAINER_HEIGHT} ${DEFAULT_DESKTOP_HEIGHT}`

	if (articles.length === 0) return null

	return (
		<div id="introducing-column">
			<div>
				<div className="mb-[26px]">
					<TitleLine title={title} />
				</div>
				<div className="flex flex-col gap-y-[64px]">
					<div>
						<div ref={containerRef} className={`thin-scrollbar overflow-y-auto ${containerHeight}`}>
							<div className="flex flex-col gap-y-[24px]">
								{articles.map((article, i) => (
									<Link
										key={article.id}
										className="group relative top-0 flex gap-[16px]"
										href={`/research/${article.slug}`}
										onClick={() =>
											pushResearchAnalyticsEvent(article, 'widget_click', 'DefiLlama Research Introducing column')
										}
									>
										<div className="relative aspect-[160/96] w-[105px] min-w-[105px] overflow-hidden rounded-lg group-hover:brightness-[0.8] lg:min-w-[160px]">
											{article.coverImage?.url ? (
												<img
													src={article.coverImage.url}
													alt=""
													className="h-full w-full object-cover"
													loading="lazy"
													decoding="async"
												/>
											) : null}
										</div>

										<div className="flex grow flex-col justify-between gap-[7px] pr-[12px]">
											<div
												className={`line-clamp-3 leading-[135%] font-medium text-[#0d1e3b] group-hover:text-[#0c2956] group-hover:opacity-70 dark:text-white dark:group-hover:text-white/70 ${'text-[16px]'}`}
											>
												{i === 0 && (
													<InViewAnalytics
														eventParams={[article, 'widget_impression', 'DefiLlama Research Introducing column']}
													/>
												)}
												{article.title}
											</div>
											<div className="text-[12px] font-bold text-[#3A8BFF] dark:text-white/80">
												{formatDate(article.publishedAt)}
											</div>
										</div>
									</Link>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

interface ResearchIntroducingWithHeightProps {
	title: string
	articles: ArticleDocument[]
}

export function ResearchIntroducingWithHeight({ title, articles }: ResearchIntroducingWithHeightProps) {
	const context = useSharedHeight()
	const height = context?.height

	return <ResearchIntroducing title={title} articles={articles} sharedHeight={height} />
}
