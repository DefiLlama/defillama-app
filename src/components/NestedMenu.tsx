import * as Ariakit from '@ariakit/react'
import * as React from 'react'
import { Icon } from './Icon'

interface NestedMenuItemProps extends Ariakit.MenuItemProps {
	ref?: React.Ref<HTMLDivElement>
}

export function NestedMenuItem({ ref, ...props }: NestedMenuItemProps) {
	return <Ariakit.MenuItem ref={ref} {...props} className={`${props.className ?? ''}`} />
}

interface NestedMenuProps extends Ariakit.MenuButtonProps<'div'> {
	label: React.ReactNode
	menuPortal?: boolean
	buttonVariant?: 'default' | 'filter'
	ref?: React.Ref<HTMLDivElement>
}

export function NestedMenu({
	label,
	children,
	ref,
	menuPortal = false,
	buttonVariant = 'default',
	...props
}: NestedMenuProps) {
	const menu = Ariakit.useMenuStore()
	const shouldPortalMenu = menuPortal || Boolean(menu.parent)

	const rootButtonClassName =
		buttonVariant === 'filter'
			? 'relative flex cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)'
			: 'flex items-center justify-between gap-3 rounded-md bg-(--btn-bg) px-3 py-2 hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg)'

	return (
		<Ariakit.MenuProvider store={menu}>
			<Ariakit.MenuButton
				ref={ref}
				{...props}
				className={`${
					!menu.parent
						? rootButtonClassName
						: 'flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)'
				} ${props.className ?? ''}`}
				render={menu.parent ? <NestedMenuItem hideOnClick={false} render={props.render} /> : undefined}
			>
				<span className="label">{label}</span>
				<Ariakit.MenuButtonArrow />
			</Ariakit.MenuButton>
			<Ariakit.Menu
				unmountOnHide
				hideOnInteractOutside
				gutter={menu.parent ? 4 : 8}
				shift={menu.parent ? -9 : 0}
				portal={shouldPortalMenu}
				wrapperProps={{
					className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
				}}
				className={`${menu.parent ? 'z-20' : 'z-10'} flex thin-scrollbar flex-col rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:h-[calc(100dvh-80px)] max-sm:overflow-auto max-sm:rounded-b-none max-sm:p-2 sm:max-h-[60dvh] sm:overflow-x-hidden sm:overflow-y-auto sm:p-0 dark:border-[hsl(204,3%,32%)] ${
					menu.parent ? 'max-sm:drawer-to-left' : 'max-sm:drawer'
				}`}
			>
				<Ariakit.MenuDismiss className="ml-auto px-3 py-1 sm:hidden">
					<Icon name="x" height={16} width={16} />
					<span className="sr-only">Close dialog</span>
				</Ariakit.MenuDismiss>
				{menu.parent ? (
					<>
						<div className="grid grid-cols-[1fr_auto_1fr] items-end sm:hidden">
							<button
								className="-ml-1.5 flex items-center justify-between gap-3 px-3 py-2"
								onClick={() => {
									menu.hide()
								}}
								aria-label="Back to parent menu"
							>
								<Icon name="chevron-left" height={20} width={20} />
							</button>
							<h1 className="px-3 py-1.5 text-base font-medium">{label}</h1>
						</div>
					</>
				) : null}
				{children}
			</Ariakit.Menu>
		</Ariakit.MenuProvider>
	)
}
