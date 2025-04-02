import * as Ariakit from '@ariakit/react'
import * as React from 'react'

export interface NestedMenuItemProps extends Ariakit.MenuItemProps {}

export const NestedMenuItem = React.forwardRef<HTMLDivElement, NestedMenuItemProps>(function MenuItem(props, ref) {
	return <Ariakit.MenuItem ref={ref} {...props} className={`${props.className}`} />
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
						? 'flex items-center justify-between gap-3 py-2 px-3 bg-[var(--btn-bg)] rounded-md'
						: 'flex items-center justify-between gap-3 py-2 px-3'
				} ${props.className}`}
				render={menu.parent ? <NestedMenuItem render={props.render} /> : undefined}
			>
				<span className="label">{label}</span>
				<Ariakit.MenuButtonArrow />
			</Ariakit.MenuButton>
			<Ariakit.Menu
				unmountOnHide
				gutter={8}
				shift={menu.parent ? -9 : 0}
				wrapperProps={{
					className: 'max-sm:!fixed max-sm:!bottom-0 max-sm:!top-[unset] max-sm:!transform-none max-sm:!w-full'
				}}
				className={`flex flex-col gap-2 rounded-md bg-[var(--bg1)] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] z-10 p-2 overflow-x-auto max-sm:drawer max-sm:h-[70vh]`}
			>
				{menu.parent ? (
					<>
						<div className="grid items-end grid-cols-[1fr_auto_1fr]">
							<button
								className="flex items-center justify-between gap-3 py-2 px-3"
								onClick={() => {
									menu.hide()
								}}
								aria-label="Back to parent menu"
							>
								<Ariakit.MenuButtonArrow placement="left" />
							</button>
							<h1 className="py-[6px] px-3 font-medium">{label}</h1>
						</div>
					</>
				) : null}
				{children}
			</Ariakit.Menu>
		</Ariakit.MenuProvider>
	)
})
