import { HTMLAttributes, ReactNode, createContext, forwardRef, useContext, useMemo } from 'react'
import { Menu, MenuItem as BaseMenuItem, MenuButton, MenuButtonArrow, useMenuState } from 'ariakit/menu'
import { Select, SelectPopover, SelectState } from 'ariakit/select'
import { useSetPopoverStyles } from '~/components/Popover/utils'

type MenuContextProps = {
	getWrapper: () => HTMLElement | null
	getMenu: () => HTMLElement | null
	getOffsetRight: () => number
}

const MenuContext = createContext<MenuContextProps | null>(null)

export type MenuProps = HTMLAttributes<HTMLDivElement> & {
	label: ReactNode
	disabled?: boolean
	variant?: 'primary' | 'secondary'
	selectState?: SelectState<any>
}

export const SlidingMenu = forwardRef<HTMLDivElement, MenuProps>(function SMenu(
	{ label, children, variant = 'primary', selectState, ...props },
	ref
) {
	const parent = useContext(MenuContext)
	const isSubmenu = !!parent
	const [isLarge, renderCallback] = useSetPopoverStyles()

	const menu = useMenuState({
		...(selectState || {}),
		placement: isSubmenu ? 'right-start' : 'bottom-start',
		overflowPadding: isSubmenu ? 0 : 8,
		animated: isSubmenu ? 500 : false,
		gutter: isSubmenu ? 0 : 8,
		flip: !isSubmenu,
		getAnchorRect: (anchor) => {
			return parent?.getMenu()?.getBoundingClientRect() || anchor?.getBoundingClientRect() || null
		},
		renderCallback
	})

	// By default, submenus don't automatically receive focus when they open.
	// But here we want them to always receive focus.
	if (!parent && menu.open && !menu.autoFocusOnShow) {
		menu.setAutoFocusOnShow(true)
		menu.setInitialFocus('first')
	}

	const contextValue = useMemo<MenuContextProps>(
		() => ({
			getWrapper: () => parent?.getWrapper() || menu.popoverRef.current,
			getMenu: () => menu.baseRef.current,
			getOffsetRight: () => (parent?.getOffsetRight() ?? 0) + (menu.baseRef.current?.offsetWidth ?? 0)
		}),
		[menu.popoverRef, menu.baseRef, parent]
	)

	const autoFocus = (element: HTMLElement) => {
		if (!isSubmenu) return true
		element.focus({ preventScroll: true })
		element.scrollIntoView({ block: 'nearest', inline: 'start' })
		return false
	}

	return (
		<>
			{isSubmenu ? (
				selectState ? (
					<Select
						as="div"
						className="flex items-center justify-between gap-3 py-2 px-3"
						state={selectState}
						ref={ref}
						{...props}
					>
						<span className="overflow-hidden whitespace-nowrap text-ellipsis">{label}</span>
						<MenuButtonArrow placement="right" />
					</Select>
				) : (
					<MenuButton className="flex items-center justify-between gap-3 py-2 px-3" state={menu} showOnHover={false}>
						<span className="overflow-hidden whitespace-nowrap text-ellipsis">{label}</span>
						<MenuButtonArrow />
					</MenuButton>
				)
			) : (
				// Otherwise, we just render the menu button.
				<MenuButton
					as="div"
					className="flex items-center justify-between gap-3 py-2 px-3 bg-[var(--btn-bg)] rounded-md"
					state={menu}
					showOnHover={false}
					ref={ref}
					{...props}
				>
					<span className="overflow-hidden whitespace-nowrap text-ellipsis">{label}</span>
					<MenuButtonArrow placement="right" />
				</MenuButton>
			)}

			{menu.mounted &&
				(selectState && selectState.mounted && selectState.open ? (
					<SelectPopover
						state={selectState}
						portal={isSubmenu}
						portalElement={parent?.getWrapper}
						style={{ left: 'auto' }}
						autoFocusOnShow={autoFocus}
						autoFocusOnHide={autoFocus}
						composite={true}
						data-menuwrapper={false}
						className="h-[70vh] flex flex-col gap-2 rounded-md bg-[var(--bg1)] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] z-10 p-2 overflow-x-auto data-[menuwrapper=true]:animate-slideup data-[leave]:z-0"
					>
						<MenuContext.Provider value={contextValue}>
							{isSubmenu ? (
								<div className="grid items-end grid-cols-[1fr_auto_1fr]">
									<button
										className="flex items-center justify-between gap-3 py-2 px-3"
										onClick={() => {
											selectState.hide()
											menu.hide()
										}}
										aria-label="Back to parent menu"
									>
										<MenuButtonArrow placement="left" />
									</button>
									<h2 className="py-[6px] px-3 font-medium">{label}</h2>
								</div>
							) : null}
							{children}
						</MenuContext.Provider>
					</SelectPopover>
				) : (
					<Menu
						state={menu}
						portal={isSubmenu}
						portalElement={parent?.getWrapper}
						style={{ left: 'auto' }}
						autoFocusOnShow={autoFocus}
						autoFocusOnHide={autoFocus}
						modal={!isLarge}
						data-menuwrapper={!isSubmenu ? 'true' : 'false'}
						className="h-[70vh] flex flex-col gap-2 rounded-md bg-[var(--bg1)] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] z-10 p-2 overflow-x-auto data-[menuwrapper=true]:animate-slideup data-[leave]:z-0"
					>
						<MenuContext.Provider value={contextValue}>
							{isSubmenu ? (
								<div className="grid items-end grid-cols-[1fr_auto_1fr]">
									<button
										className="flex items-center justify-between gap-3 py-2 px-3"
										onClick={menu.hide}
										aria-label="Back to parent menu"
									>
										<MenuButtonArrow placement="left" />
									</button>
									<h2 className="py-[6px] px-3 font-medium">{label}</h2>
								</div>
							) : null}
							{children}
						</MenuContext.Provider>
					</Menu>
				))}
		</>
	)
})

export type MenuItemProps = HTMLAttributes<HTMLButtonElement> & {
	label: ReactNode
	disabled?: boolean
	variant?: 'primary' | 'secondary'
}

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(function SMenuItem(
	{ label, variant = 'primary', ...props },
	ref
) {
	return (
		<BaseMenuItem
			className="flex items-center justify-between gap-3 py-2 px-3"
			as="button"
			focusOnHover={false}
			ref={ref}
			{...props}
		>
			{label}
		</BaseMenuItem>
	)
})
