import { useMemo } from 'react'
import * as Ariakit from '@ariakit/react'
import { Icon } from './Icon'
import { BasicLink } from './Link'

interface IMenuProps {
	options: string[] | string
	name: string
	isExternal?: boolean
	onItemClick?: (value: any) => void
	className?: string
	portal?: boolean
}

export function Menu({ options, name, isExternal, onItemClick, className, portal, ...props }: IMenuProps) {
	const { _options } = useMemo(() => {
		return {
			_options: typeof options === 'string' ? [options] : options
		}
	}, [options])

	return (
		<Ariakit.MenuProvider>
			<Ariakit.MenuButton
				{...props}
				className={
					className ??
					'relative flex max-w-fit cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md bg-(--btn2-bg) px-3 py-2 text-(--text-primary) hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)'
				}
			>
				{name}
				<Ariakit.MenuButtonArrow />
			</Ariakit.MenuButton>
			<Ariakit.Menu
				unmountOnHide
				hideOnInteractOutside
				gutter={8}
				wrapperProps={{
					className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
				}}
				className="max-sm:drawer z-10 flex h-[calc(100dvh-80px)] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:rounded-b-none sm:max-h-[60dvh] sm:max-w-md lg:h-full lg:max-h-(--popover-available-height) dark:border-[hsl(204,3%,32%)]"
				portal={portal || false}
			>
				<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
					<Icon name="x" className="h-5 w-5" />
				</Ariakit.PopoverDismiss>

				{_options.map((value, i) => {
					return onItemClick ? (
						<Ariakit.MenuItem
							key={value + i}
							onClick={() => onItemClick(value)}
							className="flex shrink-0 cursor-pointer items-center justify-between gap-4 overflow-hidden border-b border-(--form-control-border) px-3 py-2 text-ellipsis whitespace-nowrap first-of-type:rounded-t-md last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
						>
							{value}
						</Ariakit.MenuItem>
					) : isExternal ? (
						<Ariakit.MenuItem
							render={<a href={value} target="_blank" rel="noopener noreferrer" />}
							key={value + i}
							className="shrink-0 cursor-pointer overflow-hidden border-b border-(--form-control-border) px-3 py-2 text-ellipsis whitespace-nowrap first-of-type:rounded-t-md last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
						>
							{value}
						</Ariakit.MenuItem>
					) : (
						<Ariakit.MenuItem
							key={value + i}
							render={<BasicLink href={value} />}
							className="flex shrink-0 cursor-pointer items-center justify-between gap-4 overflow-hidden border-b border-(--form-control-border) px-3 py-2 text-ellipsis whitespace-nowrap first-of-type:rounded-t-md last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
						>
							{value}
						</Ariakit.MenuItem>
					)
				})}
			</Ariakit.Menu>
		</Ariakit.MenuProvider>
	)
}
