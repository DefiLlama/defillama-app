import * as React from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Tooltip } from '~/components/Tooltip'

export const LinkToPage = React.memo(function LinkToPage({
	route,
	name,
	icon,
	attention,
	asPath,
	isCollapsed = false
}: {
	route: string
	name: string
	icon?: string
	attention?: boolean
	asPath: string
	isCollapsed?: boolean
}) {
	const isActive = route === asPath.split('/?')[0].split('?')[0]
	const isExternal = route.startsWith('http')

	const linkContent = (
		<BasicLink
			href={route}
			data-linkactive={isActive}
			target={isExternal ? '_blank' : undefined}
			rel={isExternal ? 'noopener noreferrer' : undefined}
			className={`group/link relative flex flex-1 items-center rounded-md hover:bg-black/5 focus-visible:bg-black/5 data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white dark:hover:bg-white/10 dark:focus-visible:bg-white/10 ${isCollapsed ? 'h-10 w-10 justify-center p-2' : '-ml-1.5 gap-3 p-1.5'}`}
		>
			<NavItemContent name={name} icon={icon} attention={attention} isCollapsed={isCollapsed} />
		</BasicLink>
	)

	if (isCollapsed) {
		return (
			<Tooltip content={name} placement="right">
				{linkContent}
			</Tooltip>
		)
	}

	return linkContent
})

export const NavItemContent = React.memo(function NavItemContent({
	name,
	icon,
	attention,
	isCollapsed = false
}: {
	name: string
	icon?: string
	attention?: boolean
	isCollapsed?: boolean
}) {
	return (
		<>
			{icon ? (
				<Icon
					name={icon as any}
					className={`group-hover/link:animate-wiggle shrink-0 ${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`}
				/>
			) : name === 'LlamaAI' ? (
				<svg className={`group-hover/link:animate-wiggle shrink-0 ${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`}>
					<use href="/icons/ask-llamaai-3.svg#ai-icon" />
				</svg>
			) : null}
			<span
				className="relative flex min-w-0 flex-1 flex-wrap items-center gap-2 overflow-hidden text-left leading-tight transition-all duration-300"
				style={{
					opacity: isCollapsed ? 0 : 1,
					maxWidth: isCollapsed ? 0 : '100%',
					width: isCollapsed ? 0 : 'auto'
				}}
			>
				<span className="min-w-0 break-words whitespace-nowrap">{name}</span>
				{attention ? (
					<span
						aria-hidden
						className="inline-block h-2 w-2 shrink-0 rounded-full bg-(--error) shadow-[0_0_0_2px_var(--app-bg)]"
					/>
				) : null}
			</span>
			{isCollapsed && attention && (
				<span
					aria-hidden
					className="absolute top-1 right-1 h-2 w-2 shrink-0 rounded-full bg-(--error) shadow-[0_0_0_2px_var(--app-bg)]"
				/>
			)}
		</>
	)
})
