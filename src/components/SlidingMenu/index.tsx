import {
	HTMLAttributes,
	ReactNode,
	RefAttributes,
	createContext,
	forwardRef,
	useContext,
	useEffect,
	useMemo
} from 'react'
import { flushSync } from 'react-dom'
import useIsomorphicLayoutEffect from 'use-isomorphic-layout-effect'
import {
	Menu,
	MenuItem,
	MenuSeparator as BaseMenuSeparator,
	MenuButton,
	MenuButtonArrow,
	MenuHeading,
	useMenuState
} from 'ariakit/menu'
import { SelectState } from 'ariakit/select'
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

type TMenuButtonProps = HTMLAttributes<HTMLDivElement> & RefAttributes<HTMLDivElement>

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
	if (!menu.autoFocusOnShow) {
		menu.setAutoFocusOnShow(true)
	}

	const contextValue = useMemo<MenuContextProps>(
		() => ({
			getWrapper: () => parent?.getWrapper() || menu.popoverRef.current,
			getMenu: () => menu.baseRef.current,
			getOffsetRight: () => (parent?.getOffsetRight() ?? 0) + (menu.baseRef.current?.offsetWidth ?? 0)
		}),
		[menu.popoverRef, menu.baseRef, parent]
	)

	// Hide the submenu when it's not visible on scroll.
	useEffect(() => {
		if (!parent) return
		const parentWrapper = parent.getWrapper()
		if (!parentWrapper) return
		let timeout = 0
		const onScroll = () => {
			clearTimeout(timeout)
			timeout = window.setTimeout(() => {
				// In right-to-left layouts, scrollLeft is negative.
				const scrollLeft = Math.abs(parentWrapper.scrollLeft)
				const wrapperOffset = scrollLeft + parentWrapper.clientWidth
				if (wrapperOffset <= parent.getOffsetRight()) {
					// Since the submenu is not visible anymore at this point, we want
					// to hide it completely right away. That's why we syncrhonously
					// hide it and immediately stops the animation so it's completely
					// unmounted.
					flushSync(menu.hide)
					menu.stopAnimation()
				}
			}, 100)
		}
		parentWrapper.addEventListener('scroll', onScroll)
		return () => parentWrapper.removeEventListener('scroll', onScroll)
	}, [parent, menu])

	// We only want to delay hiding the menu, so we immediately stop the
	// animation when it's opening.
	useIsomorphicLayoutEffect(() => {
		if (!menu.open) return
		menu.stopAnimation()
	}, [menu.open, menu.stopAnimation])

	const renderMenuButton = (menuButtonProps: TMenuButtonProps) => (
		<MenuButton
			className="sliding-menu-button"
			state={menu}
			showOnHover={false}
			data-variant={variant}
			{...menuButtonProps}
		>
			<span>{label}</span>
			<MenuButtonArrow />
		</MenuButton>
	)

	const wrapperProps = {
		// This is necessary so Chrome scrolls the submenu into view.
		style: { left: 'auto' }
	}

	const autoFocus = (element: HTMLElement) => {
		if (!isSubmenu) return true
		element.focus({ preventScroll: true })
		element.scrollIntoView({ block: 'nearest', inline: 'start' })
		return false
	}

	return (
		<>
			{isSubmenu ? (
				// If it's a submenu, we have to combine the MenuButton and the
				// MenuItem components into a single component, so it works as a
				// submenu button.
				<MenuItem className="sliding-menu-item" data-variant={variant} ref={ref} focusOnHover={false} {...props}>
					{renderMenuButton}
				</MenuItem>
			) : (
				// Otherwise, we just render the menu button.
				renderMenuButton({ ref, ...props })
			)}
			{menu.mounted && (selectState ? selectState.mounted : true) && (
				<Menu
					state={menu}
					portal={isSubmenu}
					portalElement={parent?.getWrapper}
					wrapperProps={wrapperProps}
					autoFocusOnShow={autoFocus}
					autoFocusOnHide={autoFocus}
					modal={!isLarge}
					composite={false}
					data-variant={variant}
					data-menuwrapper={!isSubmenu ? 'true' : 'false'}
					className="sliding-menu"
				>
					<MenuContext.Provider value={contextValue}>
						{isSubmenu && (
							<>
								<Header>
									<MenuItem
										className="sliding-menu-item"
										data-variant={variant}
										hideOnClick={false}
										focusOnHover={false}
										onClick={menu.hide}
										aria-label="Back to parent menu"
									>
										<MenuButtonArrow placement="left" />
									</MenuItem>
									<MenuHeading className="heading">{label}</MenuHeading>
								</Header>
								<SlidingMenuSeparator />
							</>
						)}
						{children}
					</MenuContext.Provider>
				</Menu>
			)}
		</>
	)
})

export type MenuItemProps = HTMLAttributes<HTMLButtonElement> & {
	label: ReactNode
	disabled?: boolean
	variant?: 'primary' | 'secondary'
}

export const SlidingMenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(function SMenuItem(
	{ label, variant = 'primary', ...props },
	ref
) {
	return (
		<MenuItem
			className="sliding-menu-item"
			as="button"
			data-variant={variant}
			focusOnHover={false}
			ref={ref}
			{...props}
		>
			{label}
		</MenuItem>
	)
})

export type MenuSeparatorProps = HTMLAttributes<HTMLHRElement>

export const SlidingMenuSeparator = forwardRef<HTMLHRElement, MenuSeparatorProps>(function SSeperator(props, ref) {
	return <MenuSeparator ref={ref} {...props} />
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

const MenuSeparator = styled(BaseMenuSeparator)`
	border-color: ${({ theme }) => theme.divider};
`
