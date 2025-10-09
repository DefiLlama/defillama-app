import * as React from 'react'
import { useRouter } from 'next/router'
import { Disclosure, DisclosureContent, useDisclosureStore } from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Tooltip } from '../Tooltip'
import { useNavCollapse } from './NavCollapseContext'
import type { NavGroup as NavGroupType, NavItem, NavLink as NavLinkType } from './navStructure'

interface NavGroupProps {
	group: NavGroupType
	isExpanded: boolean
	depth?: number
	showUnpin?: boolean
	onUnpin?: (route: string) => void
}

interface NavLinkProps {
	link: NavLinkType
	isExpanded: boolean
	depth?: number
	showUnpin?: boolean
	onUnpin?: (route: string) => void
}

export const NavLink = React.memo(function NavLink({ link, isExpanded, depth = 0, showUnpin, onUnpin }: NavLinkProps) {
	const { asPath } = useRouter()
	const isActive = link.route === asPath.split('/?')[0].split('?')[0]

	const iconSize = 'h-4 w-4'

	// Visual weight for footer/resource links
	const getVisualWeight = () => {
		if (['Support', 'Documentation', 'Contact us'].includes(link.label)) {
			return 'opacity-100'
		}
		if (['Careers', 'Report Incorrect Data', 'Press / Media', 'List your project'].includes(link.label)) {
			return 'opacity-70'
		}
		if (['Twitter', 'Discord'].includes(link.label)) {
			return 'opacity-50'
		}
		if (['Donate'].includes(link.label)) {
			return 'opacity-60'
		}
		return 'opacity-100'
	}

	const linkElement = (
		<BasicLink
			href={link.route}
			data-linkactive={isActive}
			aria-current={isActive ? 'page' : undefined}
			className={`group/link flex w-full cursor-pointer flex-nowrap items-center rounded-md border-0 p-2 no-underline transition-colors duration-200 ease-out hover:bg-black/5 hover:text-(--text-primary) focus-visible:bg-black/5 disabled:pointer-events-none disabled:opacity-40 data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white dark:hover:bg-white/10 dark:focus-visible:bg-white/10 ${isExpanded ? 'gap-2' : 'justify-center'} ${getVisualWeight()}`}
			target={link.external ? '_blank' : undefined}
			rel={link.external ? 'noopener noreferrer' : undefined}
		>
			{link.icon ? (
				<Icon name={link.icon as any} className={`${iconSize} group-hover/link:animate-wiggle shrink-0 fill-current`} />
			) : link.emoji ? (
				<span className={`${iconSize} shrink-0 text-center leading-none`}>{link.emoji}</span>
			) : null}
			{isExpanded ? (
				<div className="flex min-w-0 flex-auto flex-col items-start justify-center self-stretch overflow-hidden">
					<span
						className={`font-inherit text-sm leading-normal whitespace-nowrap ${isActive ? 'text-white' : 'text-(--text-primary)'}`}
					>
						{link.label}
						{link.badge && (
							<span className="ml-1.5 rounded bg-(--primary) px-1.5 py-0.5 text-xs font-medium text-white">
								{link.badge.toUpperCase()}
							</span>
						)}
						{link.attention && (
							<span
								aria-hidden
								className="ml-1.5 inline-block h-2 w-2 rounded-full bg-(--error) shadow-[0_0_0_2px_var(--app-bg)]"
							/>
						)}
					</span>
				</div>
			) : (
				<span className="sr-only">{link.label}</span>
			)}
		</BasicLink>
	)

	const content =
		!isExpanded && (link.icon || link.emoji) ? (
			<Tooltip content={link.label} placement="right">
				{linkElement}
			</Tooltip>
		) : (
			linkElement
		)

	// Add unpin button column if needed
	if (showUnpin && onUnpin && isExpanded) {
		return (
			<div className="group/pinned flex items-center gap-1">
				{content}
				<Tooltip
					content="Unpin from navigation"
					placement="right"
					tooltipClassName="z-50 max-h-[calc(100dvh-80px)] max-w-56 overflow-auto rounded-md border border-red-200 bg-red-50 p-2 text-sm font-medium text-red-700 whitespace-pre-wrap shadow-lg data-[fullwidth=true]:max-w-(--popover-available-width) lg:max-h-(--popover-available-height) dark:border-red-900 dark:bg-red-950 dark:text-red-100"
				>
					<button
						onClick={(e) => {
							onUnpin(link.route)
							e.preventDefault()
							e.stopPropagation()
						}}
						className="group/unpin shrink-0 rounded-md p-1 text-(--text-form) transition-colors hover:text-red-600 focus-visible:text-red-600 dark:hover:text-red-400 dark:focus-visible:text-red-400"
						aria-label="Unpin from navigation"
					>
						<Icon
							name="pin"
							className="h-4 w-4 transition-transform duration-200 group-hover/unpin:-translate-y-0.5 group-hover/unpin:rotate-[15deg] group-focus-visible/unpin:-translate-y-0.5 group-focus-visible/unpin:rotate-[15deg]"
							style={{ '--icon-fill': 'currentColor' } as any}
						/>
					</button>
				</Tooltip>
			</div>
		)
	}

	return content
})

export const NavGroup = React.memo(function NavGroup({
	group,
	isExpanded,
	depth = 0,
	showUnpin,
	onUnpin
}: NavGroupProps) {
	const disclosure = useDisclosureStore({
		defaultOpen: group.defaultOpen ?? false,
		// When sidebar is collapsed, close all groups
		open: isExpanded ? undefined : false
	})

	const open = disclosure.useState('open')
	const iconSize = 'h-4 w-4'

	// Register with collapse context (all groups, not just nested)
	const navCollapse = useNavCollapse()
	const groupId = React.useId()

	React.useEffect(() => {
		if (navCollapse) {
			navCollapse.registerDisclosure(groupId, disclosure)
			return () => navCollapse.unregisterDisclosure(groupId)
		}
	}, [navCollapse, groupId, disclosure])

	// When sidebar expands, restore default state
	React.useEffect(() => {
		if (isExpanded && group.defaultOpen) {
			disclosure.setOpen(true)
		}
	}, [isExpanded, group.defaultOpen, disclosure])

	const trigger = (
		<Disclosure
			store={disclosure}
			data-state={open ? 'open' : 'closed'}
			className={`group/disclosure flex w-full cursor-pointer flex-nowrap items-center rounded-md border-0 p-2 no-underline transition-colors duration-200 ease-out hover:bg-black/5 hover:text-(--text-primary) focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10 ${isExpanded ? 'gap-2' : 'justify-center'}`}
		>
			{group.icon ? (
				<Icon name={group.icon as any} className={`${iconSize} order-1 shrink-0 fill-current`} />
			) : group.emoji ? (
				<span className={`${iconSize} order-1 shrink-0 text-center leading-none`}>{group.emoji}</span>
			) : null}
			{isExpanded ? (
				<div className="order-2 flex min-w-0 flex-auto flex-col items-start justify-center self-stretch overflow-hidden">
					<span className="text-sm leading-normal font-medium whitespace-nowrap text-(--text-primary)">
						{group.label}
					</span>
				</div>
			) : (
				<span className="sr-only">{group.label}</span>
			)}
			{isExpanded && (
				<Icon
					name="chevron-down"
					className={`${iconSize} order-3 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
				/>
			)}
			{!isExpanded && <span className="sr-only">{group.label}</span>}
		</Disclosure>
	)

	return (
		<div className="flex flex-col gap-0.5">
			{!isExpanded && (group.icon || group.emoji) ? (
				<Tooltip content={group.label} placement="right">
					{trigger}
				</Tooltip>
			) : (
				trigger
			)}
			<DisclosureContent store={disclosure} className="flex gap-0.5 py-1">
				{/* Vertical indicator line - only show when expanded */}
				{isExpanded && (
					<div
						className="w-0.5 shrink-0 bg-black/10 dark:bg-white/20"
						style={{ marginLeft: '10px', marginRight: '4px' }}
					/>
				)}
				<div className="flex flex-1 flex-col gap-0.5">
					{group.children.map((child, index) => {
						if (child.type === 'link') {
							return (
								<NavLink
									key={`${child.route}-${index}`}
									link={child}
									isExpanded={isExpanded}
									depth={depth + 1}
									showUnpin={showUnpin}
									onUnpin={onUnpin}
								/>
							)
						}
						if (child.type === 'group') {
							return (
								<NavGroup
									key={`${child.label}-${index}`}
									group={child}
									isExpanded={isExpanded}
									depth={depth + 1}
									showUnpin={showUnpin}
									onUnpin={onUnpin}
								/>
							)
						}
						return null
					})}
				</div>
			</DisclosureContent>
		</div>
	)
})

interface NavItemsProps {
	items: NavItem[]
	isExpanded: boolean
	showUnpin?: boolean
	onUnpin?: (route: string) => void
}

export const NavItems = React.memo(function NavItems({ items, isExpanded, showUnpin, onUnpin }: NavItemsProps) {
	return (
		<>
			{items.map((item, index) => {
				if (item.type === 'link') {
					return (
						<NavLink
							key={`${item.route}-${index}`}
							link={item}
							isExpanded={isExpanded}
							showUnpin={showUnpin}
							onUnpin={onUnpin}
						/>
					)
				}
				if (item.type === 'group') {
					return (
						<NavGroup
							key={`${item.label}-${index}`}
							group={item}
							isExpanded={isExpanded}
							showUnpin={showUnpin}
							onUnpin={onUnpin}
						/>
					)
				}
				if (item.type === 'separator') {
					return (
						<div key={`separator-${index}`} className="my-2">
							{item.label && isExpanded && <p className="mb-1 px-1.5 text-xs opacity-50">{item.label}</p>}
							<hr className="-ml-1.5 border-black/10 dark:border-white/10" />
						</div>
					)
				}
				return null
			})}
		</>
	)
})
