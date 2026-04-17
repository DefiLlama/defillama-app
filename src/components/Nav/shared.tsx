import { Icon } from '~/components/Icon'
import type { IIcon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'

type NavIconName = IIcon['name']

export function LinkToPage({
	route,
	name,
	icon,
	attention,
	freeTrial,
	isNew,
	asPath,
	umamiEvent,
	onClick,
	isOld
}: {
	route: string
	name: string
	icon?: NavIconName
	attention?: boolean
	freeTrial?: boolean
	isNew?: boolean
	asPath: string
	umamiEvent?: string
	onClick?: () => void
	isOld?: boolean
}) {
	const cleanAsPath = asPath.split('/?')[0].split('?')[0]
	const isActive = isOld ? route === cleanAsPath : cleanAsPath === route || cleanAsPath.startsWith(route + '/')
	const isExternal = route.startsWith('http')

	return (
		<BasicLink
			href={route}
			data-linkactive={isActive}
			data-umami-event={umamiEvent}
			target={isExternal ? '_blank' : undefined}
			rel={isExternal ? 'noopener noreferrer' : undefined}
			className="group/link -ml-1.5 flex flex-1 items-center gap-3 rounded-md p-1.5 cv-auto-30 hover:bg-black/5 focus-visible:bg-black/5 data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
			onClick={onClick}
		>
			<NavItemContent name={name} icon={icon} attention={attention} freeTrial={freeTrial} isNew={isNew} />
		</BasicLink>
	)
}

export function NavItemContent({
	name,
	icon,
	attention,
	freeTrial,
	isNew
}: {
	name: string
	icon?: NavIconName
	attention?: boolean
	freeTrial?: boolean
	isNew?: boolean
}) {
	return (
		<>
			{icon ? (
				<Icon name={icon} className="h-4 w-4 shrink-0 group-hover/link:animate-wiggle" />
			) : name === 'LlamaAI' ? (
				<svg className="h-4 w-4 shrink-0 group-hover/link:animate-wiggle">
					<use href="/assets/llamaai/ask-llamaai-3.svg#ai-icon" />
				</svg>
			) : null}
			<span className="relative flex min-w-0 flex-1 flex-nowrap items-center gap-2 text-left leading-tight">
				<span className="min-w-0 flex-1 truncate">{name}</span>
				{attention ? (
					<span
						aria-hidden
						className="inline-block h-2 w-2 shrink-0 rounded-full bg-(--error) shadow-[0_0_0_2px_var(--bg-main)]"
					/>
				) : null}
				{freeTrial ? (
					<span className="relative inline-flex shrink-0 items-center rounded-full border border-[#C99A4A]/50 bg-linear-to-r from-[#C99A4A]/15 via-[#C99A4A]/5 to-[#C99A4A]/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#996F1F] shadow-[0_0_8px_rgba(201,154,74,0.3)] dark:border-[#FDE0A9]/50 dark:from-[#FDE0A9]/20 dark:via-[#FDE0A9]/10 dark:to-[#FDE0A9]/20 dark:text-[#FDE0A9] dark:shadow-[0_0_8px_rgba(253,224,169,0.25)]">
						Try free
					</span>
				) : null}
				{isNew ? (
					<span className="flex shrink-0 items-center gap-1 rounded-md bg-(--old-blue) px-1.5 py-0.5 text-[10px] font-bold text-white">
						<Icon name="sparkles" height={10} width={10} />
						<span>New</span>
					</span>
				) : null}
			</span>
		</>
	)
}
