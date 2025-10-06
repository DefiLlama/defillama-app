import * as React from 'react'
import * as Ariakit from '@ariakit/react'

interface ITooltip extends Ariakit.TooltipOptions {
	content: string | null | React.ReactNode
	href?: string
	shallow?: boolean
	onClick?: (e: any) => any
	children: React.ReactNode
	render?: Ariakit.TooltipOptions['render']
	color?: string
	fontSize?: string
	className?: string
	tooltipClassName?: string
	placement?:
		| 'top'
		| 'top-start'
		| 'top-end'
		| 'bottom'
		| 'bottom-start'
		| 'bottom-end'
		| 'left'
		| 'left-start'
		| 'left-end'
		| 'right'
		| 'right-start'
		| 'right-end'
	portal?: boolean
}

export function Tooltip({ content, children, placement = 'top-start', className, tooltipClassName, ...props }: ITooltip) {
	const store = Ariakit.useTooltipStore({ placement })

	if (!content || content === '') return <>{children}</>

	return (
		<Ariakit.TooltipProvider store={store}>
			<Ariakit.TooltipAnchor
				store={store}
				className={`flex shrink-0 items-center overflow-hidden text-ellipsis whitespace-nowrap ${className ?? ''}`}
				render={<span />}
				onTouchStart={store.toggle}
				onMouseLeave={store.hide}
				{...props}
			>
				{children}
			</Ariakit.TooltipAnchor>
			<Ariakit.Tooltip
				store={store}
				className={
					tooltipClassName ||
					'z-50 max-h-[calc(100dvh-80px)] max-w-56 overflow-auto rounded-md border border-gray-200 bg-gray-900 p-2 text-sm text-white whitespace-pre-wrap shadow-lg data-[fullwidth=true]:max-w-(--popover-available-width) lg:max-h-(--popover-available-height) dark:border-gray-700 dark:bg-gray-100 dark:text-gray-900'
				}
				unmountOnHide
				portal
				data-fullwidth={props['data-fullwidth']}
			>
				{content}
			</Ariakit.Tooltip>
		</Ariakit.TooltipProvider>
	)
}
