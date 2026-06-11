import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { avatarColorStyle } from '~/containers/Authors/avatarColor'
import { FollowAuthorButton } from '~/containers/Authors/FollowAuthorButton'
import { useFollowingAuthors } from '../hooks/useFollowingAuthors'
import type { FollowingShelf } from '../services/DashboardAPI'
import { DashboardCard } from './DashboardCard'
import { LoadingSpinner } from './LoadingSpinner'

function ShelfRail({ children, itemCount }: { children: ReactNode; itemCount: number }) {
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
		const scrollAmount = direction === 'left' ? -640 : 640
		container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
	}

	return (
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
				{children}
			</div>

			{canScrollRight && itemCount > 3 ? (
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
	)
}

function AuthorShelf({ shelf }: { shelf: FollowingShelf }) {
	const { author } = shelf
	const hasMore = shelf.dashboardCount > shelf.dashboards.length

	return (
		<section className="flex flex-col gap-3">
			<div className="flex items-center gap-3">
				<BasicLink href={`/authors/${author.slug}`} className="shrink-0">
					{author.avatarUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img src={author.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
					) : (
						<span
							className="flex size-10 items-center justify-center rounded-full text-xl"
							style={avatarColorStyle(author.slug)}
						>
							🦙
						</span>
					)}
				</BasicLink>
				<div className="min-w-0 flex-1">
					<BasicLink
						href={`/authors/${author.slug}`}
						className="block truncate text-base font-semibold text-(--text-primary) hover:text-(--old-blue)"
					>
						{author.displayName}
					</BasicLink>
					<p className="truncate text-xs text-(--text-label)">
						{shelf.dashboardCount} {shelf.dashboardCount === 1 ? 'dashboard' : 'dashboards'}
					</p>
				</div>
				<FollowAuthorButton slug={author.slug} following isOwnProfile={false} />
			</div>

			{shelf.dashboards.length === 0 ? (
				<p className="rounded-md border border-dashed border-(--cards-border) px-4 py-6 text-center text-sm text-(--text-label)">
					No public dashboards yet
				</p>
			) : (
				<ShelfRail itemCount={shelf.dashboards.length + (hasMore ? 1 : 0)}>
					{shelf.dashboards.map((dashboard) => (
						<div
							key={dashboard.id}
							className="w-[300px] shrink-0 snap-start scroll-ml-4 md:w-[320px] md:snap-align-none"
						>
							<DashboardCard dashboard={dashboard} viewMode="grid" className="h-full" />
						</div>
					))}
					{hasMore ? (
						<BasicLink
							href={`/authors/${author.slug}`}
							className="flex w-[160px] shrink-0 snap-start items-center justify-center gap-1 rounded-md border border-dashed border-(--cards-border) text-sm text-(--text-label) transition-colors hover:border-(--old-blue)/40 hover:text-(--old-blue) md:snap-align-none"
						>
							View all {shelf.dashboardCount}
							<Icon name="chevron-right" height={14} width={14} />
						</BasicLink>
					) : null}
				</ShelfRail>
			)}
		</section>
	)
}

export function FollowingShelves() {
	const { shelves, isLoading, page, totalPages, goToPage } = useFollowingAuthors()

	if (isLoading && shelves.length === 0) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) px-1 py-12">
				<LoadingSpinner />
			</div>
		)
	}

	if (shelves.length === 0) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) px-1 py-12">
				<Icon name="users" height={48} width={48} className="text-(--text-label)" />
				<h1 className="text-center text-2xl font-bold">You're not following anyone yet</h1>
				<p className="text-center text-(--text-label)">
					Follow dashboard authors and their latest public dashboards will appear here. Find authors from the Discover
					tab!
				</p>
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-8">
			{shelves.map((shelf) => (
				<AuthorShelf key={shelf.author.slug} shelf={shelf} />
			))}

			{totalPages > 1 ? (
				<div className="flex items-center justify-center gap-2">
					<button
						onClick={() => goToPage(Math.max(1, page - 1))}
						disabled={page === 1}
						className={`px-3 py-1 ${page === 1 ? 'cursor-not-allowed pro-text3' : 'pro-text1 hover:bg-(--bg-glass)'}`}
					>
						<Icon name="chevron-left" height={16} width={16} />
					</button>

					{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
						let pageNum = i + 1
						if (totalPages > 5) {
							if (page > 3) {
								pageNum = page - 2 + i
								if (pageNum > totalPages) {
									pageNum = totalPages - 4 + i
								}
							}
						}
						return (
							<button
								key={pageNum}
								onClick={() => goToPage(pageNum)}
								className={`px-3 py-1 ${
									page === pageNum ? 'bg-(--primary) text-white' : 'pro-text1 hover:bg-(--bg-glass)'
								}`}
							>
								{pageNum}
							</button>
						)
					})}

					<button
						onClick={() => goToPage(Math.min(totalPages, page + 1))}
						disabled={page === totalPages}
						className={`px-3 py-1 ${
							page === totalPages ? 'cursor-not-allowed pro-text3' : 'pro-text1 hover:bg-(--bg-glass)'
						}`}
					>
						<Icon name="chevron-right" height={16} width={16} />
					</button>
				</div>
			) : null}
		</div>
	)
}
