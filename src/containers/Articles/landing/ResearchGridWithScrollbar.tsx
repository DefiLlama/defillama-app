import Link from 'next/link'
import { useLayoutEffect, useRef } from 'react'
import { InViewAnalytics, pushResearchAnalyticsEvent } from '~/containers/Articles/landing/Analytics'
import { useSharedHeight } from '~/containers/Articles/landing/ResearchSectionWithSharedHeight'
import { TitleLine } from '~/containers/Articles/landing/TitleLine'
import { articleHref, formatDate } from '~/containers/Articles/landing/utils'
import type { LightweightArticleDocument } from '~/containers/Articles/types'
import { useScrollerHeightFromFirstItem } from '~/hooks/useScrollerHeightFromFirstItem'

interface ResearchGridWithScrollbarProps {
	id: string
	title: string
	articles: LightweightArticleDocument[]
	pageWidget: string
}

export function ResearchGridWithScrollbar({ id, title, articles, pageWidget }: ResearchGridWithScrollbarProps) {
	const context = useSharedHeight()
	const setHeight = context?.setHeight

	if (articles.length === 0) return null

	return (
		<div id={id}>
			<div>
				<div className="mb-[26px]">
					<TitleLine title={title} />
				</div>
				<ResearchGridWithScrollbarScroller articles={articles} pageWidget={pageWidget} onHeightChange={setHeight} />
			</div>
		</div>
	)
}

interface ResearchGridScrollerProps {
	articles: LightweightArticleDocument[]
	pageWidget: string
	onHeightChange?: (height: number) => void
}

function ResearchGridWithScrollbarScroller({ articles, pageWidget, onHeightChange }: ResearchGridScrollerProps) {
	const gridRef = useRef<HTMLDivElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const remeasureKey = articles.map((a) => a.id).join(',')

	const firstItemHeightPx = useScrollerHeightFromFirstItem({
		containerRef: gridRef,
		itemSelector: 'a.group',
		remeasureKey
	})

	useLayoutEffect(() => {
		if (!containerRef.current || firstItemHeightPx == null) return
		const calculatedHeight = firstItemHeightPx * 2 + 32
		containerRef.current.style.setProperty('--scroller-height', `${calculatedHeight}px`)
		onHeightChange?.(calculatedHeight)
	}, [firstItemHeightPx, onHeightChange])

	return (
		<div ref={containerRef}>
			<div className="thin-scrollbar h-[calc(160px_*_2_+_32px_*_1)] overflow-y-auto sm:h-[var(--scroller-height,_calc(288px_*_2_+_32px_*_1))]">
				<div ref={gridRef} className="grid grid-cols-2 gap-[32px] pr-4">
					{articles.map((article, i) => (
						<Link
							key={article.id}
							className="group relative top-0 overflow-hidden rounded-lg transition-all duration-200 ease-out hover:top-[-4px]"
							href={articleHref(article)}
							onClick={() => pushResearchAnalyticsEvent(article, 'widget_click', pageWidget)}
						>
							<div className="relative aspect-[207/119] overflow-hidden rounded-[7px] group-hover:brightness-[0.8] lg:min-w-[40%]">
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
							{i === 0 && <InViewAnalytics eventParams={[article, 'widget_impression', pageWidget]} />}
							<div className="flex grow flex-col pt-[16px]">
								<div className="line-clamp-4 text-[16px] leading-[150%] font-semibold text-[#0d1e3b] group-hover:text-[#0c2956] group-hover:opacity-70 dark:text-white dark:group-hover:text-white/70">
									{article.title}
								</div>
								<div className="mt-[5px] text-[14px] font-medium text-[#787878] dark:text-white/80">
									{formatDate(article.publishedAt)}
								</div>
							</div>
						</Link>
					))}
				</div>
			</div>
		</div>
	)
}
