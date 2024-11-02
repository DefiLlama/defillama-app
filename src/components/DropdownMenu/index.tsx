import Link from 'next/link'
import { Menu as AriakitMenu, MenuButton, MenuItem, MenuButtonArrow, useMenuState } from 'ariakit/menu'
import { transparentize } from 'polished'

interface IMenuProps {
	options: string[] | string
	name: string
	color?: string
	isExternal?: boolean
	onItemClick?: (value: any) => void
	variant?: 'primary' | 'secondary'
}

export function Menu({ options, name, color, isExternal, onItemClick, variant = 'primary', ...props }: IMenuProps) {
	const _options = typeof options === 'string' ? [options] : options

	const menu = useMenuState({ gutter: 8 })

	return (
		<>
			<MenuButton
				{...props}
				style={
					color
						? ({ '--btn2-bg': transparentize(0.9, color), '--btn2-hover-bg': transparentize(0.8, color) } as any)
						: {}
				}
				state={menu}
				className="bg-[var(--btn2-bg)] hover:bg-[var(--btn2-hover-bg)] focus-visible:bg-[var(--btn2-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-xl cursor-pointer text-[var(--text1)] flex-nowrap relative max-w-fit"
			>
				{name}
				<MenuButtonArrow />
			</MenuButton>
			{menu.mounted ? (
				<AriakitMenu
					state={menu}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer"
				>
					{_options.map((value, i) => {
						return onItemClick ? (
							<MenuItem
								as="button"
								key={value + i}
								onClick={() => onItemClick(value)}
								className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] cursor-pointer first-of-type:rounded-t-md last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
							>
								{value}
							</MenuItem>
						) : isExternal ? (
							<MenuItem
								as="a"
								href={value}
								target="_blank"
								rel="noopener noreferrer"
								key={value + i}
								className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] cursor-pointer first-of-type:rounded-t-md last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
							>
								{value}
							</MenuItem>
						) : (
							<Link href={value} key={value + i} passHref>
								<MenuItem className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] cursor-pointer first-of-type:rounded-t-md last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10">
									{value}
								</MenuItem>
							</Link>
						)
					})}
				</AriakitMenu>
			) : null}
		</>
	)
}
