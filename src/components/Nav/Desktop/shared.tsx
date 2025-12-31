import * as React from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'

export const LinkToPage = React.memo(function LinkToPage({
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
	const isExternal = route.startsWith('http')

	return (
		<BasicLink
			href={route}
			data-linkactive={isActive}
			target={isExternal ? '_blank' : undefined}
			rel={isExternal ? 'noopener noreferrer' : undefined}
			className="group/link -ml-1.5 flex flex-1 items-center gap-3 rounded-md p-1.5 hover:bg-black/5 focus-visible:bg-black/5 data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
		>
			<NavItemContent name={name} icon={icon} attention={attention} />
		</BasicLink>
	)
})

export const NavItemContent = React.memo(function NavItemContent({
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
				<svg className="group-hover/link:animate-wiggle h-4 w-4 shrink-0">
					<use href="/icons/ask-llamaai-3.svg#ai-icon" />
				</svg>
			) : null}
			<span className="relative flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left leading-tight">
				<span className="min-w-0 break-words">{name}</span>
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
