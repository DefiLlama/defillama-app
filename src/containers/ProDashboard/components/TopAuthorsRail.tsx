import { useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { avatarColorStyle } from '~/containers/Authors/avatarColor'
import type { TopAuthorEntry } from '~/containers/Authors/types'
import { useTopAuthors } from '../hooks/useTopAuthors'

const COUNT_FORMATTER = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

function AuthorCard({ entry }: { entry: TopAuthorEntry }) {
	const { author } = entry
	return (
		<BasicLink
			href={`/authors/${author.slug}`}
			className="group flex h-full flex-col gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4 transition-colors hover:border-(--old-blue)/40"
		>
			<div className="flex items-center gap-3">
				{author.avatarUrl ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={author.avatarUrl} alt="" className="size-10 shrink-0 rounded-full object-cover" />
				) : (
					<span
						className="flex size-10 shrink-0 items-center justify-center rounded-full text-xl"
						style={avatarColorStyle(author.slug)}
					>
						🦙
					</span>
				)}
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold text-(--text-primary) group-hover:text-(--old-blue)">
						{author.displayName}
					</p>
					<p className="truncate text-xs text-(--text-label)">@{author.slug}</p>
				</div>
			</div>
			{author.bio ? <p className="line-clamp-2 text-xs leading-5 text-(--text-label)">{author.bio}</p> : null}
			<div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-(--cards-border) pt-3 text-xs text-(--text-label) tabular-nums">
				<span className="inline-flex items-center gap-1" title="Public dashboards">
					<Icon name="layout-grid" height={12} width={12} />
					{COUNT_FORMATTER.format(entry.dashboardCount)}
				</span>
				<span className="inline-flex items-center gap-1" title="Total views">
					<Icon name="eye" height={12} width={12} />
					{COUNT_FORMATTER.format(entry.totalViews)}
				</span>
				<span className="inline-flex items-center gap-1" title="Total likes">
					<Icon name="star" height={12} width={12} />
					{COUNT_FORMATTER.format(entry.totalLikes)}
				</span>
				<span className="inline-flex items-center gap-1" title="Followers">
					<Icon name="users" height={12} width={12} />
					{COUNT_FORMATTER.format(entry.followerCount)}
				</span>
			</div>
		</BasicLink>
	)
}

export function TopAuthorsRail() {
	const { authors, isLoading } = useTopAuthors()
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const [canScrollLeft, setCanScrollLeft] = useState(false)
	const [canScrollRight, setCanScrollRight] = useState(true)
	const rafIdRef = useRef<number | null>(null)
	const prevScrollStateRef = useRef({ canScrollLeft: false, canScrollRight: true })

	const updateScrollState = () => {
		if (rafIdRef.current) return

		rafIdRef.current = requestAnimationFrame(() => {
			rafIdRef.current = null
			const container = scrollContainerRef.current
			if (!container) return

			const { scrollLeft, scrollWidth, clientWidth } = container
			const newCanScrollLeft = scrollLeft > 0
			const newCanScrollRight = scrollLeft < scrollWidth - clientWidth - 10

			if (newCanScrollLeft !== prevScrollStateRef.current.canScrollLeft) {
				prevScrollStateRef.current.canScrollLeft = newCanScrollLeft
				setCanScrollLeft(newCanScrollLeft)
			}
			if (newCanScrollRight !== prevScrollStateRef.current.canScrollRight) {
				prevScrollStateRef.current.canScrollRight = newCanScrollRight
				setCanScrollRight(newCanScrollRight)
			}
		})
	}

	useEffect(() => {
		return () => {
			if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
		}
	}, [])

	const scroll = (direction: 'left' | 'right') => {
		const container = scrollContainerRef.current
		if (!container) return
		const scrollAmount = direction === 'left' ? -560 : 560
		container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
	}

	if (isLoading) {
		return (
			<div className="flex flex-col gap-3">
				<div className="flex flex-col gap-0.5">
					<h3 className="flex items-center gap-2 text-lg font-semibold">
						<span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/15">
							<Icon name="users" height={18} width={18} className="text-blue-500" />
						</span>
						Top Authors
					</h3>
					<p className="ml-9 text-xs text-(--text-label)">The most viewed dashboard builders on DefiLlama Pro</p>
				</div>
				<div className="flex gap-4 overflow-hidden">
					{Array.from({ length: 6 }).map((_, i) => (
						<div
							key={`skeleton-top-authors-${i}`}
							className="relative isolate min-h-[150px] w-[260px] shrink-0 overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg)"
						>
							<div className="pointer-events-none absolute inset-y-0 -right-1/2 -left-1/2 animate-shimmer bg-[linear-gradient(99.97deg,transparent,rgba(0,0,0,0.08),transparent)] dark:bg-[linear-gradient(99.97deg,transparent,rgba(255,255,255,0.08),transparent)]" />
						</div>
					))}
				</div>
			</div>
		)
	}

	if (authors.length === 0) {
		return null
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-0.5">
				<h3 className="flex items-center gap-2 text-lg font-semibold">
					<span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/15">
						<Icon name="users" height={18} width={18} className="text-blue-500" />
					</span>
					Top Authors
				</h3>
				<p className="ml-9 text-xs text-(--text-label)">The most viewed dashboard builders on DefiLlama Pro</p>
			</div>

			<div className="relative">
				{canScrollLeft ? (
					<>
						<div className="pointer-events-none absolute inset-y-0 left-0 z-5 hidden w-16 bg-linear-to-r from-(--app-bg) to-transparent md:block" />
						<button
							type="button"
							onClick={() => scroll('left')}
							className="absolute top-1/2 left-2 z-10 hidden -translate-y-1/2 rounded-full border border-(--cards-border) bg-(--cards-bg) p-2 shadow-md hover:bg-(--btn-hover-bg) md:block"
						>
							<Icon name="chevron-left" height={20} width={20} />
						</button>
					</>
				) : null}

				<div
					ref={scrollContainerRef}
					onScroll={updateScrollState}
					className="no-scrollbar flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto pb-2 md:snap-none"
				>
					{authors.map((entry) => (
						<div key={entry.author.slug} className="w-[260px] shrink-0 snap-start scroll-ml-4 md:snap-align-none">
							<AuthorCard entry={entry} />
						</div>
					))}
				</div>

				{canScrollRight && authors.length > 4 ? (
					<>
						<div className="pointer-events-none absolute inset-y-0 right-0 z-5 hidden w-16 bg-linear-to-l from-(--app-bg) to-transparent md:block" />
						<button
							type="button"
							onClick={() => scroll('right')}
							className="absolute top-1/2 right-2 z-10 hidden -translate-y-1/2 rounded-full border border-(--cards-border) bg-(--cards-bg) p-2 shadow-md hover:bg-(--btn-hover-bg) md:block"
						>
							<Icon name="chevron-right" height={20} width={20} />
						</button>
					</>
				) : null}
			</div>
		</div>
	)
}
