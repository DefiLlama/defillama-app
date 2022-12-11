import { HTMLAttributes, ReactNode, createContext, forwardRef, useContext, useMemo } from 'react'
import { Menu, MenuItem as BaseMenuItem, MenuButton, MenuButtonArrow, useMenuState } from 'ariakit/menu'
import { Select, SelectPopover, SelectState } from 'ariakit/select'
import styled from 'styled-components'
import { useSetPopoverStyles } from '../Popover/utils'

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
						className="sliding-menu-button"
						state={selectState}
						data-variant={variant}
						ref={ref}
						{...props}
					>
						<span>{label}</span>
						<MenuButtonArrow placement="right" />
					</Select>
				) : (
					<MenuButton className="sliding-menu-button" state={menu} showOnHover={false} data-variant={variant}>
						<span>{label}</span>
						<MenuButtonArrow />
					</MenuButton>
				)
			) : (
				// Otherwise, we just render the menu button.
				<MenuButton
					as="div"
					className="sliding-menu-button"
					state={menu}
					showOnHover={false}
					data-variant={variant}
					ref={ref}
					{...props}
				>
					<span>{label}</span>
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
						data-variant={variant}
						data-menuwrapper={false}
						className="sliding-menu"
					>
						<MenuContext.Provider value={contextValue}>
							{isSubmenu && (
								<Header>
									<button
										className="sliding-menu-item"
										data-variant={variant}
										onClick={() => {
											selectState.hide()
											menu.hide()
										}}
										aria-label="Back to parent menu"
									>
										<MenuButtonArrow placement="left" />
									</button>
									<h2>{label}</h2>
								</Header>
							)}
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
						data-variant={variant}
						data-menuwrapper={!isSubmenu ? 'true' : 'false'}
						className="sliding-menu"
					>
						<MenuContext.Provider value={contextValue}>
							{isSubmenu && (
								<Header>
									<button
										className="sliding-menu-item"
										data-variant={variant}
										onClick={menu.hide}
										aria-label="Back to parent menu"
									>
										<MenuButtonArrow placement="left" />
									</button>
									<h2>{label}</h2>
								</Header>
							)}
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
			className="sliding-menu-button"
			as="button"
			data-variant={variant}
			focusOnHover={false}
			ref={ref}
			{...props}
		>
			{label}
		</BaseMenuItem>
	)
})

const Header = styled.div`
	display: grid;
	align-items: center;
	grid-template-columns: 1fr auto 1fr;

	h2 {
		font-size: 1rem;
		font-weight: 500;
	}
`
