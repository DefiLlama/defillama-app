import * as Ariakit from '@ariakit/react'
import * as React from 'react'
import { lazy, Suspense, useState } from 'react'
import { Icon } from '~/components/Icon'
import { Account } from '../Account'
import { PremiumHeader } from '../PremiumHeader'
import { LinkToPage } from '../shared'
import type { TNavLink, TNavLinks, TOldNavLink } from '../types'

const ReorderablePinnedPages = lazy(() => import('./ReorderablePinnedPages'))

export function Menu({
	mainLinks,
	pinnedPages,
	userDashboards,
	footerLinks,
	oldMetricLinks,
	asPath
}: {
	mainLinks: TNavLinks
	pinnedPages: Array<TNavLink>
	userDashboards: Array<TNavLink>
	footerLinks: TNavLinks
	oldMetricLinks: Array<TOldNavLink>
	asPath: string
}) {
	const [show, setShow] = useState(false)
	const handleClose = () => setShow(false)

	return (
		<Ariakit.DialogProvider open={show} setOpen={setShow}>
			<Ariakit.DialogDisclosure className="-my-0.5 rounded-md bg-[#445ed0] p-3 text-white shadow">
				<span className="sr-only">Open Navigation Menu</span>
				<Icon name="menu" height={16} width={16} />
			</Ariakit.DialogDisclosure>

			<Ariakit.Dialog
				unmountOnHide={false}
				className="fixed top-0 right-0 bottom-0 z-10 flex w-full max-w-[300px] drawer-to-left flex-col overflow-auto bg-(--bg-main) p-4 pl-5 text-black dark:text-white"
			>
				<nav className="flex flex-1 flex-col">
					<Ariakit.DialogDismiss className="ml-auto">
						<span className="sr-only">Close Navigation Menu</span>
						<Icon name="x" height={20} width={20} strokeWidth="4px" />
					</Ariakit.DialogDismiss>

					{mainLinks.map(({ category, pages }) => (
						<div key={`mobile-nav-${category}`} className="group mb-3 flex flex-col first:mb-auto">
							{category === 'Premium' ? <PremiumHeader /> : <p className="mb-1 text-xs opacity-65">{category}</p>}
							<hr className="border-black/20 dark:border-white/20" />
							{pages.map(({ name, route, icon, attention, isNew, umamiEvent }) => (
								<LinkToPage
									route={route}
									name={name}
									icon={icon}
									attention={attention}
									isNew={isNew}
									key={`mobile-nav-${name}-${route}`}
									asPath={asPath}
									onClick={handleClose}
									umamiEvent={umamiEvent}
								/>
							))}
						</div>
					))}

					<details className="group mb-3">
						<summary className="-ml-1.5 flex items-center justify-between gap-3 rounded-md p-1.5 text-xs opacity-65 hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10">
							<span>Old Menu</span>
							<Icon name="chevron-down" className="h-4 w-4 shrink-0 group-open:rotate-180" />
						</summary>
						<div className="border-l border-black/20 pl-2 group-open:border-l dark:border-white/20">
							{oldMetricLinks.map(({ name, route, pages }: TOldNavLink) => (
								<React.Fragment key={`mobile-nav-old-${name}-${route}`}>
									{pages ? (
										<details className="group/second">
											<summary className="-ml-1.5 flex items-center justify-between gap-3 rounded-md p-1.5 hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10">
												<span>{name}</span>
												<Icon name="chevron-down" className="h-4 w-4 shrink-0 group-open/second:rotate-180" />
											</summary>
											<div className="border-l border-black/20 pl-2 dark:border-white/20">
												{pages.map(({ name: pageName, route: pageRoute }) => (
													<LinkToPage
														route={pageRoute}
														name={pageName}
														key={`mobile-nav-old-${pageName}-${pageRoute}`}
														asPath={asPath}
														onClick={handleClose}
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
											onClick={handleClose}
										/>
									) : null}
								</React.Fragment>
							))}
						</div>
					</details>

					{pinnedPages.length > 0 ? (
						<PinnedPagesSection pinnedPages={pinnedPages} asPath={asPath} onClose={handleClose} />
					) : null}

					{userDashboards.length > 0 ? (
						<div className="group mb-3 flex flex-col first:mb-auto">
							<p className="mb-1 text-xs opacity-65">Your Dashboards</p>
							<hr className="border-black/20 dark:border-white/20" />
							{userDashboards.map(({ name, route, icon }) => (
								<LinkToPage
									route={route}
									name={name}
									icon={icon}
									key={`mobile-nav-${name}-${route}`}
									asPath={asPath}
									onClick={handleClose}
								/>
							))}
						</div>
					) : null}

					{footerLinks.map(({ category, pages }) => (
						<div key={`mobile-nav-${category}`} className="group mb-3 flex flex-col first:mb-auto">
							<p className="mb-1 text-xs opacity-65">{category}</p>
							<hr className="border-black/20 dark:border-white/20" />
							{pages.map(({ name, route, icon }) => (
								<LinkToPage
									route={route}
									name={name}
									icon={icon}
									key={`mobile-nav-${name}-${route}`}
									asPath={asPath}
									onClick={handleClose}
								/>
							))}
						</div>
					))}

					<hr className="my-3 border-black/20 dark:border-white/20" />

					<Account asPath={asPath} />
				</nav>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}

function PinnedPagesSection({
	pinnedPages,
	asPath,
	onClose
}: {
	pinnedPages: Array<TNavLink>
	asPath: string
	onClose: () => void
}) {
	const [isReordering, setIsReordering] = useState(false)

	React.useEffect(() => {
		if (pinnedPages.length <= 1 && isReordering) {
			setIsReordering(false)
		}
	}, [isReordering, pinnedPages.length])

	return (
		<div className="group/pinned mb-3 flex flex-col first:mb-auto">
			<div className="mb-1 flex items-center justify-between gap-2 text-xs opacity-65">
				<span>Pinned Pages</span>
				{pinnedPages.length > 1 ? (
					<button
						type="button"
						className="rounded-md px-2 py-1 text-[11px] font-semibold tracking-wide text-(--text-tertiary) uppercase hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
						onClick={() => setIsReordering((v) => !v)}
					>
						{isReordering ? 'Done' : 'Reorder'}
					</button>
				) : null}
			</div>
			<hr className="border-black/20 dark:border-white/20" />
			{isReordering ? (
				<>
					<p className="mt-1 text-[11px] text-(--text-tertiary)">Drag to reorder, tap remove to unpin</p>
					<Suspense fallback={<div className="mt-1 min-h-[40px]" />}>
						<ReorderablePinnedPages pinnedPages={pinnedPages} />
					</Suspense>
				</>
			) : (
				<div className="mt-1 flex flex-col gap-1">
					{pinnedPages.map((page) => (
						<LinkToPage
							key={`mobile-nav-pinned-${page.name}-${page.route}`}
							route={page.route}
							name={page.name}
							icon={page.icon}
							attention={page.attention}
							asPath={asPath}
							onClick={onClose}
						/>
					))}
				</div>
			)}
		</div>
	)
}
