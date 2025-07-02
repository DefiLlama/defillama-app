import * as Ariakit from '@ariakit/react'
import { transparentize } from 'polished'
import { useMemo } from 'react'
import { BasicLink } from './Link'

interface IMenuProps {
	options: string[] | string
	name: string
	color?: string
	isExternal?: boolean
	onItemClick?: (value: any) => void
	variant?: 'primary' | 'secondary'
	className?: string
	portal?: boolean
}

export function Menu({
	options,
	name,
	color,
	isExternal,
	onItemClick,
	variant = 'primary',
	className,
	portal,
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
					'bg-(--btn2-bg) hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg) flex items-center justify-between gap-2 py-2 px-3 rounded-md cursor-pointer text-(--text1) flex-nowrap relative max-w-fit'
				}
			>
				{name}
				<Ariakit.MenuButtonArrow />
			</Ariakit.MenuButton>
			<Ariakit.Menu
				unmountOnHide
				gutter={8}
				wrapperProps={{
					className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
				}}
				className="flex flex-col bg-(--bg1) rounded-md max-sm:rounded-b-none z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer sm:max-w-md"
				portal={portal || false}
			>
				{_options.map((value, i) => {
					return onItemClick ? (
						<Ariakit.MenuItem
							key={value + i}
							onClick={() => onItemClick(value)}
							className="flex items-center justify-between gap-4 py-2 px-3 shrink-0 hover:bg-(--primary1-hover) focus-visible:bg-(--primary1-hover) data-active-item:bg-(--primary1-hover) cursor-pointer first-of-type:rounded-t-md last-of-type:rounded-b-md border-b border-(--form-control-border) whitespace-nowrap overflow-hidden text-ellipsis"
						>
							{value}
						</Ariakit.MenuItem>
					) : isExternal ? (
						<Ariakit.MenuItem
							render={<a href={value} target="_blank" rel="noopener noreferrer" />}
							key={value + i}
							className="py-2 px-3 shrink-0 hover:bg-(--primary1-hover) focus-visible:bg-(--primary1-hover) data-active-item:bg-(--primary1-hover) cursor-pointer first-of-type:rounded-t-md last-of-type:rounded-b-md border-b border-(--form-control-border) whitespace-nowrap overflow-hidden text-ellipsis"
						>
							{value}
						</Ariakit.MenuItem>
					) : (
						<Ariakit.MenuItem
							key={value + i}
							render={<BasicLink href={value} />}
							className="flex items-center justify-between gap-4 py-2 px-3 shrink-0 hover:bg-(--primary1-hover) focus-visible:bg-(--primary1-hover) data-active-item:bg-(--primary1-hover) cursor-pointer first-of-type:rounded-t-md last-of-type:rounded-b-md border-b border-(--form-control-border) whitespace-nowrap overflow-hidden text-ellipsis"
						>
							{value}
						</Ariakit.MenuItem>
					)
				})}
			</Ariakit.Menu>
		</Ariakit.MenuProvider>
	)
}
