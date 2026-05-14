import Link from 'next/link'
import type { CSSProperties } from 'react'
import { useEffect } from 'react'
import { useSharedHeight } from '~/containers/Articles/landing/ResearchSectionWithSharedHeight'
import { TitleLine } from '~/containers/Articles/landing/TitleLine'
import type { ArticleDocument } from '~/containers/Articles/types'

interface ResearchWidgetWithScrollbarProps {
	id: string
	title: string
	articles: ArticleDocument[]
	onHeightChange?: (height: number) => void
}

const DEFAULT_CONTAINER_HEIGHT = 'h-[calc(65px_*_6_+_12px_*_5)]'
const DESKTOP_CONTAINER_HEIGHT = 'lg:h-[var(--container-height)]'
const CONTAINER_HEIGHT_VALUE = 70 * 5 + 24 * 4

export function ResearchWidgetWithScrollbar({ id, title, articles, onHeightChange }: ResearchWidgetWithScrollbarProps) {
	if (!articles.length) return null

	return (
		<div id={id}>
			<div className="mb-[26px]">
				<TitleLine title={title} />
			</div>
			<div className="flex flex-col gap-y-[64px]">
				<div>
					<ResearchWidgetWithScrollbarScroller articles={articles} onHeightChange={onHeightChange} />
				</div>
			</div>
		</div>
	)
}

interface ResearchWidgetWithScrollbarScrollerProps {
	articles: ArticleDocument[]
	onHeightChange?: (height: number) => void
}

function ResearchWidgetWithScrollbarScroller({ articles, onHeightChange }: ResearchWidgetWithScrollbarScrollerProps) {
	useEffect(() => {
		onHeightChange?.(CONTAINER_HEIGHT_VALUE)
	}, [onHeightChange, articles])

	const containerHeight = `${DEFAULT_CONTAINER_HEIGHT} ${DESKTOP_CONTAINER_HEIGHT}`
	const style = { '--container-height': `${CONTAINER_HEIGHT_VALUE}px` } as CSSProperties

	return (
		<div style={style}>
			<div className={`thin-scrollbar overflow-y-auto ${containerHeight}`}>
				<div className="flex flex-col gap-y-[12px] lg:gap-y-[24px]">
					{articles.map((article) => {
						const img = article.coverImage?.url
						return (
							<Link
								key={article.id}
								className="group relative top-0 flex gap-[16px] overflow-hidden rounded-lg"
								href={`/research/${article.slug}`}
							>
								<div className="relative aspect-[85/65] w-[85px] min-w-[85px] overflow-hidden rounded-[7px] group-hover:brightness-[0.8] lg:aspect-[120/70] lg:w-[120px] lg:min-w-[120px]">
									{img ? (
										<img src={img} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
									) : null}
								</div>

								<div className="flex grow flex-col justify-between gap-[7px] pr-[20px]">
									<div className="line-clamp-3 text-[16px] leading-[135%] font-semibold text-[#0d1e3b] group-hover:text-[#0c2956] group-hover:opacity-70 dark:text-white dark:group-hover:text-white/70">
										{article.title}
									</div>
								</div>
							</Link>
						)
					})}
				</div>
			</div>
		</div>
	)
}

interface ResearchWidgetWithScrollbarWithHeightProps {
	id: string
	title: string
	articles: ArticleDocument[]
}

export function ResearchWidgetWithScrollbarWithHeight({
	id,
	title,
	articles
}: ResearchWidgetWithScrollbarWithHeightProps) {
	const context = useSharedHeight()
	const setHeight = context?.setHeight

	return <ResearchWidgetWithScrollbar id={id} title={title} articles={articles} onHeightChange={setHeight} />
}
