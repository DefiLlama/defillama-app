import * as React from 'react'
import { useRouter } from 'next/router'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Tooltip } from '../Tooltip'
import { mutatePinnedMetrics } from './pinnedUtils'
import { ThemeSwitch } from './ThemeSwitch'
import { TNavLink, TNavLinks, TOldNavLink } from './types'

const Account = React.lazy(() => import('./Account').then((mod) => ({ default: mod.Account })))

const NAV_ITEM_CLASS =
	'-ml-1.5 flex flex-1 items-center gap-3 rounded-md p-1.5 hover:bg-black/5 focus-visible:bg-black/5 data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white dark:hover:bg-white/10 dark:focus-visible:bg-white/10'

export const DesktopNav = React.memo(function DesktopNav({
	mainLinks,
	pinnedPages,
	userDashboards,
	footerLinks,
	oldMetricLinks
}: {
	mainLinks: TNavLinks
	pinnedPages: Array<TNavLink>
	userDashboards: Array<TNavLink>
	footerLinks: TNavLinks
	oldMetricLinks: Array<TOldNavLink>
}) {
	const { asPath } = useRouter()

	return (
		<span className="col-span-1 max-lg:hidden">
			<nav className="thin-scrollbar sticky top-0 bottom-0 left-0 isolate z-10 col-span-1 flex h-screen flex-col gap-1 overflow-y-auto bg-(--app-bg) py-4 *:pl-4">
				<BasicLink href="/" className="mb-4 w-fit shrink-0">
					<span className="sr-only">Navigate to Home Page</span>
					<img
						src="/icons/defillama.webp"
						height={53}
						width={155}
						className="mr-auto hidden object-contain object-left dark:block"
						alt=""
						fetchPriority="high"
					/>
					<img
						src="/icons/defillama-dark.webp"
						height={53}
						width={155}
						className="mr-auto object-contain object-left dark:hidden"
						alt=""
						fetchPriority="high"
					/>
				</BasicLink>

				<div className="flex flex-1 flex-col gap-1 overflow-y-auto">
					{mainLinks.map(({ category, pages }) => (
						<div key={`desktop-nav-${category}`} className="group flex flex-col">
							{pages.map(({ name, route, icon, attention }) => (
								<LinkToPage
									key={`desktop-nav-${name}-${route}`}
									route={route}
									name={name}
									icon={icon}
									attention={attention}
									asPath={asPath}
								/>
							))}
						</div>
					))}

					<details className="group">
						<summary className="-ml-1.5 flex items-center justify-between gap-3 rounded-md p-1.5 text-xs opacity-65 hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10">
							<span>Old Menu</span>
							<Icon name="chevron-down" className="h-4 w-4 shrink-0 group-open:rotate-180" />
						</summary>
						<div className="border-l border-black/20 pl-2 dark:border-white/20">
							{oldMetricLinks.map(({ name, route, pages }: TOldNavLink) => (
								<React.Fragment key={`old-nav-desktop-${name}-${route ?? ''}`}>
									{pages ? (
										<details className="group/second">
											<summary className="-ml-1.5 flex items-center justify-between gap-3 rounded-md p-1.5 hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10">
												<span>{name}</span>
												<Icon name="chevron-down" className="h-4 w-4 shrink-0 group-open/second:rotate-180" />
											</summary>
											<div className="border-l border-black/20 pl-2 dark:border-white/20">
												{pages.map(({ name, route }) => (
													<LinkToPage
														key={`old-desktop-nav-${name}-${route}`}
														route={route}
														name={name}
														asPath={asPath}
													/>
												))}
											</div>
										</details>
									) : route ? (
										<LinkToPage key={`old-desktop-nav-${name}-${route}`} route={route} name={name} asPath={asPath} />
									) : null}
								</React.Fragment>
							))}
						</div>
					</details>

					{pinnedPages.length > 0 ? <PinnedPagesSection pinnedPages={pinnedPages} asPath={asPath} /> : null}

					{userDashboards.length > 0 ? (
						<div className="group">
							<p className="flex items-center justify-between gap-3 rounded-md pt-1.5 text-xs opacity-65">
								Your Dashboards
							</p>
							<div>
								{userDashboards.map(({ name, route }) => (
									<LinkToPage key={`desktop-nav-${name}-${route}`} route={route} name={name} asPath={asPath} />
								))}
							</div>
						</div>
					) : null}

					{footerLinks.map(({ category, pages }) => (
						<NavDetailsSection key={`desktop-nav-${category}`} category={category} pages={pages} asPath={asPath} />
					))}
				</div>

				<div className="sticky bottom-0 flex w-full flex-col gap-2 bg-(--app-bg)">
					<hr className="-ml-1.5 border-black/20 pb-1 dark:border-white/20" />
					<React.Suspense fallback={<div className="flex min-h-7 w-full items-center justify-center" />}>
						<Account />
					</React.Suspense>
					<ThemeSwitch />
				</div>
			</nav>
		</span>
	)
})

const PinnedPagesSection = React.memo(function PinnedPagesSection({
	pinnedPages,
	asPath
}: {
	pinnedPages: Array<TNavLink>
	asPath: string
}) {
	const [isReordering, setIsReordering] = React.useState(false)

	React.useEffect(() => {
		if (pinnedPages.length <= 1 && isReordering) {
			setIsReordering(false)
		}
	}, [isReordering, pinnedPages.length])

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 6 }
		})
	)

	const handleDragEnd = React.useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event
			if (!over || active.id === over.id) return

			const oldIndex = pinnedPages.findIndex(({ route }) => route === active.id)
			const newIndex = pinnedPages.findIndex(({ route }) => route === over.id)

			if (oldIndex === -1 || newIndex === -1) return

			const reordered = arrayMove(pinnedPages, oldIndex, newIndex)
			mutatePinnedMetrics(() => reordered.map(({ route }) => route))
		},
		[pinnedPages]
	)

	return (
		<div className="group/pinned flex flex-col">
			<div
				className="flex items-center justify-between gap-3 rounded-md pt-1.5 text-xs opacity-65"
				data-reordering={isReordering}
			>
				<span>Pinned Pages</span>
				{pinnedPages.length > 1 ? (
					<button
						type="button"
						className="invisible rounded-md px-2 py-1 text-[11px] font-semibold tracking-wide text-(--text-tertiary) uppercase group-hover/pinned:visible group-data-[reordering=true]/pinned:visible hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
						onClick={() => setIsReordering((value) => !value)}
					>
						{isReordering ? 'Done' : 'Reorder'}
					</button>
				) : null}
			</div>
			{isReordering ? <p className="text-[11px] text-(--text-tertiary)">Drag to reorder, click X to unpin</p> : null}
			<DndContext sensors={sensors} onDragEnd={handleDragEnd}>
				<SortableContext items={pinnedPages.map(({ route }) => route)} strategy={verticalListSortingStrategy}>
					<div className="flex flex-col gap-1">
						{pinnedPages.map((page) => (
							<PinnedPageRow
								key={`pinned-page-${page.name}-${page.route}`}
								page={page}
								asPath={asPath}
								isReordering={isReordering}
							/>
						))}
					</div>
				</SortableContext>
			</DndContext>
		</div>
	)
})

const PinnedPageRow = ({ page, asPath, isReordering }: { page: TNavLink; asPath: string; isReordering: boolean }) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: page.route,
		disabled: !isReordering
	})

	const style: React.CSSProperties = {
		transform: CSS.Translate.toString(transform),
		transition
	}

	const handleUnpin = React.useCallback(() => {
		mutatePinnedMetrics((routes) => routes.filter((route) => route !== page.route))
	}, [page.route])

	return (
		<span
			ref={setNodeRef}
			style={style}
			className="group relative flex flex-wrap items-center gap-1"
			data-reordering={isReordering}
			data-dragging={isDragging}
		>
			{isReordering ? (
				<div
					className={`group/link ${NAV_ITEM_CLASS} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
					data-dragging={isDragging}
				>
					<div className="flex items-center gap-2">
						<button
							type="button"
							className="flex h-7 w-7 items-center justify-center rounded-md text-(--text-tertiary) hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
							aria-label={`Drag ${page.name}`}
							{...attributes}
							{...listeners}
						>
							<Icon name="menu" className="h-4 w-4" />
						</button>
						<NavItemContent name={page.name} icon={page.icon} attention={page.attention} />
					</div>
				</div>
			) : (
				<LinkToPage route={page.route} name={page.name} icon={page.icon} attention={page.attention} asPath={asPath} />
			)}
			<Tooltip
				content="Unpin from navigation"
				render={
					<button
						onClick={(e) => {
							e.preventDefault()
							e.stopPropagation()
							handleUnpin()
						}}
					/>
				}
				className="absolute top-1/2 right-1 hidden -translate-y-1/2 rounded-md bg-(--error) px-1 py-1 text-white group-hover:block group-data-[reordering=true]:block"
			>
				<Icon name="x" className="h-4 w-4" />
			</Tooltip>
		</span>
	)
}

const NavDetailsSection = React.memo(function NavDetailsSection({
	category,
	pages,
	asPath
}: {
	category: string
	pages: TNavLink[]
	asPath: string
}) {
	const lastItemRef = React.useRef<HTMLDivElement>(null)

	return (
		<details
			className={`group ${category === 'More' ? 'mt-auto' : ''}`}
			onToggle={(e) => {
				if (e.currentTarget.open) {
					setTimeout(() => {
						lastItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
					}, 0)
				}
			}}
		>
			<summary className="-ml-1.5 flex items-center justify-between gap-3 rounded-md p-1.5 hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10">
				<span>{category}</span>
				<Icon name="chevron-up" className="h-4 w-4 shrink-0 group-open:rotate-180" />
			</summary>
			<div className="border-l border-black/20 pl-2 dark:border-white/20">
				{pages.map(({ name, route, icon, attention }, index) => (
					<div key={`desktop-nav-${name}-${route}`} ref={index === pages.length - 1 ? lastItemRef : null}>
						<LinkToPage route={route} name={name} icon={icon} attention={attention} asPath={asPath} />
					</div>
				))}
			</div>
		</details>
	)
})

const LinkToPage = React.memo(function LinkToPage({
	route,
	name,
	icon,
	attention,
	asPath
}: {
	route: string
	name: string
	icon?: string
	attention?: boolean
	asPath: string
}) {
	const isActive = route === asPath.split('/?')[0].split('?')[0]

	return (
		<BasicLink href={route} data-linkactive={isActive} className={`group/link ${NAV_ITEM_CLASS}`}>
			<NavItemContent name={name} icon={icon} attention={attention} />
		</BasicLink>
	)
})

const NavItemContent = React.memo(function NavItemContent({
	name,
	icon,
	attention
}: {
	name: string
	icon?: string
	attention?: boolean
}) {
	return (
		<>
			{icon ? (
				<Icon name={icon as any} className="group-hover/link:animate-wiggle h-4 w-4" />
			) : name === 'LlamaAI' ? (
				<img
					src="/icons/ask-llama-ai.svg"
					alt="LlamaAI"
					className="h-4 w-4 brightness-0 group-data-[linkactive=true]/link:brightness-100 dark:brightness-100 dark:group-data-[linkactive=true]/link:brightness-100"
				/>
			) : null}
			<span className="relative inline-flex items-center gap-2">
				{name}
				{attention ? (
					<span
						aria-hidden
						className="inline-block h-2 w-2 shrink-0 rounded-full bg-(--error) shadow-[0_0_0_2px_var(--app-bg)]"
					/>
				) : null}
			</span>
		</>
	)
})
