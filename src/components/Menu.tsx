import Link from 'next/link'
import * as Ariakit from '@ariakit/react'
import { transparentize } from 'polished'
import { useMemo } from 'react'

interface IMenuProps {
	options: string[] | string
	name: string
	color?: string
	isExternal?: boolean
	onItemClick?: (value: any) => void
	variant?: 'primary' | 'secondary'
	className?: string
}

export function Menu({
	options,
	name,
	color,
	isExternal,
	onItemClick,
	variant = 'primary',
	className,
	...props
}: IMenuProps) {
	const { _options, style } = useMemo(() => {
		return {
			_options: typeof options === 'string' ? [options] : options,
			style: color
				? ({ '--btn2-bg': transparentize(0.9, color), '--btn2-hover-bg': transparentize(0.8, color) } as any)
				: {}
		}
	}, [options, color])

	return (
		<Ariakit.MenuProvider>
			<Ariakit.MenuButton
				{...props}
				style={style}
				className={
					className ??
					'bg-[var(--btn2-bg)] hover:bg-[var(--btn2-hover-bg)] focus-visible:bg-[var(--btn2-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-xl cursor-pointer text-[var(--text1)] flex-nowrap relative max-w-fit'
				}
			>
				{name}
				<Ariakit.MenuButtonArrow />
			</Ariakit.MenuButton>
			<Ariakit.Menu
				unmountOnHide
				gutter={8}
				className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer"
			>
				{_options.map((value, i) => {
					return onItemClick ? (
						<Ariakit.MenuItem
							key={value + i}
							onClick={() => onItemClick(value)}
							className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] data-[active-item]:bg-[var(--primary1-hover)] cursor-pointer first-of-type:rounded-t-md last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
						>
							{value}
						</Ariakit.MenuItem>
					) : isExternal ? (
						<Ariakit.MenuItem
							render={<a href={value} target="_blank" rel="noopener noreferrer" />}
							key={value + i}
							className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] data-[active-item]:bg-[var(--primary1-hover)] cursor-pointer first-of-type:rounded-t-md last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
						>
							{value}
						</Ariakit.MenuItem>
					) : (
						<Link href={value} key={value + i} passHref>
							<Ariakit.MenuItem
								render={<a />}
								className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] data-[active-item]:bg-[var(--primary1-hover)] cursor-pointer first-of-type:rounded-t-md last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
							>
								{value}
							</Ariakit.MenuItem>
						</Link>
					)
				})}
			</Ariakit.Menu>
		</Ariakit.MenuProvider>
	)
}
