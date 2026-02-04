import { useRef, useState, useEffect } from 'react'
import { Icon, IIcon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Dashboard } from '../services/DashboardAPI'
import { DashboardCard } from './DashboardCard'

interface DiscoverySectionProps {
	title: string
	subtitle?: string
	icon: IIcon['name']
	iconBg?: string
	iconColor?: string
	dashboards: Dashboard[]
	isLoading: boolean
	seeAllHref: string
	onTagClick: (tag: string) => void
}

export function DiscoverySection({
	title,
	subtitle,
	icon,
	iconBg,
	iconColor,
	dashboards,
	isLoading,
	seeAllHref,
	onTagClick
}: DiscoverySectionProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const [canScrollLeft, setCanScrollLeft] = useState(false)
	const [canScrollRight, setCanScrollRight] = useState(true)
	const rafIdRef = useRef<number | null>(null)
	// Cache previous values to avoid unnecessary state updates
	const prevScrollStateRef = useRef({ canScrollLeft: false, canScrollRight: true })

	const updateScrollState = () => {
		// Cancel any pending RAF to avoid stacking
		if (rafIdRef.current) return

		rafIdRef.current = requestAnimationFrame(() => {
			rafIdRef.current = null
			const container = scrollContainerRef.current
			if (!container) return

			// Batch read all scroll properties at once
			const { scrollLeft, scrollWidth, clientWidth } = container
			const newCanScrollLeft = scrollLeft > 0
			const newCanScrollRight = scrollLeft < scrollWidth - clientWidth - 10

			// Only update state if values changed
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

	// Cleanup RAF on unmount
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

	if (isLoading) {
		return (
			<div className="flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<div className="flex flex-col gap-0.5">
						<h3 className="flex items-center gap-2 text-lg font-semibold">
							<span className={`flex h-7 w-7 items-center justify-center rounded-md ${iconBg ?? 'bg-(--bg-hover)'}`}>
								<Icon name={icon} height={18} width={18} className={iconColor} />
							</span>
							{title}
						</h3>
						{subtitle && <p className="ml-9 text-xs text-(--text-label)">{subtitle}</p>}
					</div>
				</div>
				<div className="flex gap-4 overflow-hidden">
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={`skeleton-${title}-${i}`}
							className="relative isolate min-h-[220px] w-[300px] shrink-0 overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg) md:w-[320px]"
						>
							<div className="pointer-events-none absolute inset-y-0 -right-1/2 -left-1/2 animate-shimmer bg-[linear-gradient(99.97deg,transparent,rgba(0,0,0,0.08),transparent)] dark:bg-[linear-gradient(99.97deg,transparent,rgba(255,255,255,0.08),transparent)]" />
						</div>
					))}
				</div>
			</div>
		)
	}

	if (dashboards.length === 0) {
		return null
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<div className="flex flex-col gap-0.5">
					<h3 className="flex items-center gap-2 text-lg font-semibold">
						<span className={`flex h-7 w-7 items-center justify-center rounded-md ${iconBg ?? 'bg-(--bg-hover)'}`}>
							<Icon name={icon} height={18} width={18} className={iconColor} />
						</span>
						{title}
					</h3>
					{subtitle && <p className="ml-9 text-xs text-(--text-label)">{subtitle}</p>}
				</div>
				<BasicLink
					href={seeAllHref}
					className="flex items-center gap-1.5 rounded-full border border-(--cards-border) bg-(--cards-bg) px-3 py-1.5 text-sm font-medium text-(--old-blue) transition-colors duration-150 hover:border-(--old-blue)/30 hover:bg-(--old-blue)/10"
				>
					See all
					<Icon name="arrow-right" height={14} width={14} />
				</BasicLink>
			</div>

			<div className="group relative">
				{canScrollLeft && (
					<>
						<div className="pointer-events-none absolute inset-y-0 left-0 z-5 hidden w-16 bg-linear-to-r from-(--app-bg) to-transparent md:block" />
						<button
							onClick={() => scroll('left')}
							className="absolute top-1/2 left-2 z-10 hidden -translate-y-1/2 rounded-full border border-(--cards-border) bg-(--cards-bg) p-2 shadow-md hover:bg-(--btn-hover-bg) md:block"
						>
							<Icon name="chevron-left" height={20} width={20} />
						</button>
					</>
				)}

				<div
					ref={scrollContainerRef}
					onScroll={updateScrollState}
					className="no-scrollbar flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto pb-2 md:snap-none"
				>
					{dashboards.map((dashboard) => (
						<div
							key={dashboard.id}
							className="w-[300px] shrink-0 snap-start scroll-ml-4 md:w-[320px] md:snap-align-none"
						>
							<DashboardCard dashboard={dashboard} onTagClick={onTagClick} viewMode="grid" className="h-full" />
						</div>
					))}
				</div>

				{canScrollRight && dashboards.length > 3 && (
					<>
						<div className="pointer-events-none absolute inset-y-0 right-0 z-5 hidden w-16 bg-linear-to-l from-(--app-bg) to-transparent md:block" />
						<button
							onClick={() => scroll('right')}
							className="absolute top-1/2 right-2 z-10 hidden -translate-y-1/2 rounded-full border border-(--cards-border) bg-(--cards-bg) p-2 shadow-md hover:bg-(--btn-hover-bg) md:block"
						>
							<Icon name="chevron-right" height={20} width={20} />
						</button>
					</>
				)}
			</div>
		</div>
	)
}
