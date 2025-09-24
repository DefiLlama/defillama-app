import * as React from 'react'
import * as Ariakit from '@ariakit/react'
import { Icon } from './Icon'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NestedMenuItemProps extends Ariakit.MenuItemProps {}

export const NestedMenuItem = React.forwardRef<HTMLDivElement, NestedMenuItemProps>(function MenuItem(props, ref) {
	return <Ariakit.MenuItem ref={ref} {...props} className={`${props.className ?? ''}`} />
})

export interface NestedMenuProps extends Ariakit.MenuButtonProps<'div'> {
	label: React.ReactNode
}

export const NestedMenu = React.forwardRef<HTMLDivElement, NestedMenuProps>(function Menu(
	{ label, children, ...props },
	ref
) {
	const menu = Ariakit.useMenuStore()

	return (
		<Ariakit.MenuProvider store={menu}>
			<Ariakit.MenuButton
				ref={ref}
				{...props}
				className={`${
					!menu.parent
						? 'flex items-center justify-between gap-3 rounded-md bg-(--btn-bg) px-3 py-2'
						: 'flex items-center justify-between gap-3 px-3 py-2'
				} ${props.className ?? ''}`}
				render={menu.parent ? <NestedMenuItem render={props.render} /> : undefined}
			>
				<span className="label">{label}</span>
				<Ariakit.MenuButtonArrow />
			</Ariakit.MenuButton>
			<Ariakit.Menu
				unmountOnHide
				hideOnInteractOutside
				gutter={8}
				shift={menu.parent ? -9 : 0}
				wrapperProps={{
					className:
						'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full! text-base'
				}}
				className={`z-10 flex h-[calc(100dvh-80px)] flex-col gap-2 overflow-x-auto rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) p-2 max-sm:rounded-b-none sm:max-h-[60vh] dark:border-[hsl(204,3%,32%)] ${
					menu.parent ? 'max-sm:drawer-to-left' : 'max-sm:drawer'
				}`}
			>
				<Ariakit.MenuDismiss className="ml-auto px-3 py-1">
					<Icon name="x" height={24} width={24} />
					<span className="sr-only">Close dialog</span>
				</Ariakit.MenuDismiss>
				{menu.parent ? (
					<>
						<div className="grid grid-cols-[1fr_auto_1fr] items-end">
							<button
								className="flex items-center justify-between gap-3 px-3 py-2"
								onClick={() => {
									menu.hide()
								}}
								aria-label="Back to parent menu"
							>
								<Ariakit.MenuButtonArrow placement="left" />
							</button>
							<h1 className="px-3 py-1.5 text-base font-medium">{label}</h1>
						</div>
					</>
				) : null}
				{children}
			</Ariakit.Menu>
		</Ariakit.MenuProvider>
	)
})
