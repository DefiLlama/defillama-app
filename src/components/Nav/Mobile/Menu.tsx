import * as React from 'react'
import { Suspense, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Account } from '../Account'
import { mutatePinnedMetrics } from '../pinnedUtils'
import { TNavLink, TNavLinks, TOldNavLink } from '../types'

export const Menu = React.memo(function Menu({
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
	const [show, setShow] = useState(false)

	const { asPath } = useRouter()

	return (
		<Ariakit.DialogProvider open={show} setOpen={setShow}>
			<Ariakit.DialogDisclosure className="-my-0.5 rounded-md bg-[#445ed0] p-3 text-white shadow">
				<span className="sr-only">Open Navigation Menu</span>
				<Icon name="menu" height={16} width={16} />
			</Ariakit.DialogDisclosure>

			<Ariakit.Dialog unmountOnHide>
				<nav className="animate-slidein fixed top-0 right-0 bottom-0 z-10 flex w-full max-w-[300px] flex-col overflow-auto bg-(--bg-main) p-4 pl-5 text-black dark:text-white">
					<Ariakit.DialogDismiss className="ml-auto">
						<span className="sr-only">Close Navigation Menu</span>
						<Icon name="x" height={20} width={20} strokeWidth="4px" />
					</Ariakit.DialogDismiss>

					{mainLinks.map(({ category, pages }) => (
						<div key={`mobile-nav-${category}`} className="group mb-3 flex flex-col first:mb-auto">
							<p className="mb-1 text-xs opacity-65">{category}</p>
							<hr className="border-black/20 dark:border-white/20" />
							{pages.map(({ name, route, attention }) => (
								<LinkToPage
									route={route}
									name={name}
									attention={attention}
									key={`mobile-nav-${name}-${route}`}
									asPath={asPath}
									setShow={setShow}
								/>
							))}
						</div>
					))}

					<details className="group mb-3">
						<summary className="-ml-1.5 flex items-center justify-between gap-3 rounded-md p-1.5 text-xs opacity-65 hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10">
							<span>Old Menu</span>
							<Icon name="chevron-down" className="h-4 w-4 shrink-0 group-open:rotate-180" />
						</summary>
						<div className="border-l border-black/20 pl-2 dark:border-white/20">
							{oldMetricLinks.map(({ name, route, pages }: TOldNavLink) => (
								<React.Fragment key={`mobile-nav-old-${name}-${route}`}>
									{pages ? (
										<details className="group/second">
											<summary className="-ml-1.5 flex items-center justify-between gap-3 rounded-md p-1.5 hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10">
												<span>{name}</span>
												<Icon name="chevron-down" className="h-4 w-4 shrink-0 group-open/second:rotate-180" />
											</summary>
											<div className="border-l border-black/20 pl-2 dark:border-white/20">
												{pages.map(({ name, route }) => (
													<LinkToPage
														route={route}
														name={name}
														key={`mobile-nav-old-${name}-${route}`}
														asPath={asPath}
														setShow={setShow}
													/>
												))}
											</div>
										</details>
									) : route ? (
										<LinkToPage
											route={route}
											name={name}
											key={`mobile-nav-old-${name}-${route}`}
											asPath={asPath}
											setShow={setShow}
										/>
									) : null}
								</React.Fragment>
							))}
						</div>
					</details>

					{pinnedPages.length > 0 ? (
						<PinnedPagesSection pinnedPages={pinnedPages} asPath={asPath} setShow={setShow} />
					) : null}

					{userDashboards.length > 0 ? (
						<div className="group mb-3 flex flex-col first:mb-auto">
							<p className="mb-1 text-xs opacity-65">Your Dashboards</p>
							<hr className="border-black/20 dark:border-white/20" />
							{userDashboards.map(({ name, route }) => (
								<LinkToPage
									route={route}
									name={name}
									key={`mobile-nav-${name}-${route}`}
									asPath={asPath}
									setShow={setShow}
								/>
							))}
						</div>
					) : null}

					{footerLinks.map(({ category, pages }) => (
						<div key={`mobile-nav-${category}`} className="group mb-3 flex flex-col first:mb-auto">
							<p className="mb-1 text-xs opacity-65">{category}</p>
							<hr className="border-black/20 dark:border-white/20" />
							{pages.map(({ name, route }) => (
								<LinkToPage
									route={route}
									name={name}
									key={`mobile-nav-${name}-${route}`}
									asPath={asPath}
									setShow={setShow}
								/>
							))}
						</div>
					))}

					<hr className="my-3 border-black/20 dark:border-white/20" />

					<Suspense fallback={<div className="flex min-h-7 w-full items-center justify-center" />}>
						<Account />
					</Suspense>
				</nav>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
})

const PinnedPagesSection = React.memo(function PinnedPagesSection({
	pinnedPages,
	asPath,
	setShow
}: {
	pinnedPages: Array<TNavLink>
	asPath: string
	setShow: (show: boolean) => void
}) {
	const [isReordering, setIsReordering] = useState(false)

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
		<div className="group/pinned mb-3 flex flex-col first:mb-auto">
			<div className="mb-1 flex items-center justify-between gap-2 text-xs opacity-65">
				<span>Pinned Pages</span>
				{pinnedPages.length > 1 ? (
					<button
						type="button"
						className="rounded-md px-2 py-1 text-[11px] font-semibold tracking-wide text-(--text-tertiary) uppercase hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
						onClick={() =>
							setIsReordering((value) => {
								const next = !value
								return next
							})
						}
					>
						{isReordering ? 'Done' : 'Reorder'}
					</button>
				) : null}
			</div>
			<hr className="border-black/20 dark:border-white/20" />
			{isReordering ? (
				<p className="mt-1 text-[11px] text-(--text-tertiary)">Drag to reorder, tap remove to unpin</p>
			) : null}
			<DndContext sensors={sensors} onDragEnd={handleDragEnd}>
				<SortableContext items={pinnedPages.map(({ route }) => route)} strategy={verticalListSortingStrategy}>
					<div className="mt-1 flex flex-col gap-1">
						{pinnedPages.map((page) => (
							<PinnedPageRow
								key={`mobile-nav-pinned-${page.name}-${page.route}`}
								page={page}
								asPath={asPath}
								setShow={setShow}
								isReordering={isReordering}
							/>
						))}
					</div>
				</SortableContext>
			</DndContext>
		</div>
	)
})

const PinnedPageRow = ({
	page,
	asPath,
	setShow,
	isReordering
}: {
	page: TNavLink
	asPath: string
	setShow: (show: boolean) => void
	isReordering: boolean
}) => {
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
		<div
			ref={setNodeRef}
			style={style}
			className="group relative"
			data-reordering={isReordering}
			data-dragging={isDragging}
		>
			{isReordering ? (
				<div
					className={`group/link -ml-1.5 flex flex-1 items-start gap-3 rounded-md p-1.5 hover:bg-black/5 focus-visible:bg-black/5 data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white dark:hover:bg-white/10 dark:focus-visible:bg-white/10 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
					data-dragging={isDragging}
				>
					<div className="flex w-full items-center gap-2">
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
						<button
							type="button"
							className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-(--error) hover:bg-(--error)/10 focus-visible:bg-(--error)/10"
							aria-label={`Unpin ${page.name}`}
							onClick={() => handleUnpin()}
						>
							<Icon name="x" className="h-4 w-4" />
						</button>
					</div>
				</div>
			) : (
				<LinkToPage
					route={page.route}
					name={page.name}
					icon={page.icon}
					attention={page.attention}
					asPath={asPath}
					setShow={setShow}
				/>
			)}
		</div>
	)
}

const LinkToPage = React.memo(function LinkToPage({
	route,
	name,
	attention,
	icon,
	asPath,
	setShow
}: {
	route: string
	name: string
	attention?: boolean
	icon?: string
	asPath: string
	setShow: (show: boolean) => void
}) {
	const isActive = route === asPath.split('/?')[0].split('?')[0]
	const isExternal = route.startsWith('http')

	return (
		<BasicLink
			href={route}
			target={isExternal ? '_blank' : undefined}
			rel={isExternal ? 'noopener noreferrer' : undefined}
			data-linkactive={isActive}
			className="group/link -ml-1.5 flex flex-1 items-center gap-3 rounded-md p-1.5 hover:bg-black/5 focus-visible:bg-black/5 data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
			onClick={() => setShow(false)}
		>
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
				<Icon name={icon as any} className="group-hover/link:animate-wiggle h-4 w-4 shrink-0" />
			) : name === 'LlamaAI' ? (
				<img
					src="/icons/ask-llamaai-3.svg#ai-icon"
					alt="LlamaAI"
					className="h-4 w-4 shrink-0 brightness-0 group-data-[linkactive=true]/link:brightness-100 dark:brightness-100 dark:group-data-[linkactive=true]/link:brightness-100"
				/>
			) : null}
			<span className="relative flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left leading-tight">
				<span className="min-w-0 break-words">{name}</span>
				{attention ? (
					<span
						aria-hidden
						className="inline-block h-2 w-2 shrink-0 rounded-full bg-(--error) shadow-[0_0_0_2px_var(--bg-main)]"
					/>
				) : null}
			</span>
		</>
	)
})
