import * as React from 'react'
import { Suspense, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Account } from '../Account'
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

			<Ariakit.Dialog
				data-active={show}
				className="fixed top-0 right-0 bottom-0 left-0 hidden bg-black/10 data-[active=true]:block"
				onClick={() => setShow(false)}
			>
				<nav
					className="animate-slidein fixed top-0 right-0 bottom-0 z-10 flex w-full max-w-[300px] flex-col overflow-auto bg-(--bg-main) p-4 pl-5 text-black dark:text-white"
					onClick={(event) => event.stopPropagation()}
				>
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
						<div className="group mb-3 flex flex-col first:mb-auto">
							<p className="mb-1 text-xs opacity-65">Pinned Pages</p>
							<hr className="border-black/20 dark:border-white/20" />
							{pinnedPages.map(({ name, route }) => (
								<LinkToPage
									route={route}
									name={name}
									key={`mobile-nav-pinned-${name}-${route}`}
									asPath={asPath}
									setShow={setShow}
								/>
							))}
						</div>
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

const LinkToPage = React.memo(function LinkToPage({
	route,
	name,
	attention,
	asPath,
	setShow
}: {
	route: string
	name: string
	attention?: boolean
	asPath: string
	setShow: (show: boolean) => void
}) {
	const isActive = route === asPath.split('/?')[0].split('?')[0]
	return (
		<BasicLink
			href={route}
			data-linkactive={isActive}
			className="-ml-1.5 flex items-center gap-3 rounded-md p-1.5 hover:bg-black/5 focus-visible:bg-black/5 data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
			onClick={() => setShow(false)}
		>
			<span className="relative inline-flex items-center gap-1">
				{name}
				{attention ? (
					<span
						aria-hidden
						className="inline-block h-2 w-2 rounded-full bg-(--error) shadow-[0_0_0_2px_var(--bg-main)]"
					/>
				) : null}
			</span>
		</BasicLink>
	)
})
