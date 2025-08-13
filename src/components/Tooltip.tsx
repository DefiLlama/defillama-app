import * as React from 'react'
import * as Ariakit from '@ariakit/react'

interface ITooltip {
	content: string | null | React.ReactNode
	href?: string
	shallow?: boolean
	onClick?: (e: any) => any
	children: React.ReactNode
	render?: Ariakit.TooltipOptions['render']
	color?: string
	fontSize?: string
	className?: string
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
}

export function Tooltip({
	content,
	children,
	color,
	fontSize,
	placement = 'top-start',
	className,
	...props
}: ITooltip) {
	const store = Ariakit.useTooltipStore({ placement })

	if (!content || content === '') return <>{children}</>

	return (
		<Ariakit.TooltipProvider store={store}>
			<Ariakit.TooltipAnchor
				store={store}
				className={`flex items-center overflow-hidden text-ellipsis whitespace-nowrap shrink-0 ${className ?? ''}`}
				render={<span />}
				onTouchStart={store.toggle}
				onMouseLeave={store.hide}
				{...props}
			>
				{children}
			</Ariakit.TooltipAnchor>

			<Ariakit.Tooltip
				store={store}
				className="z-50 text-sm p-2 max-w-56 whitespace-pre-wrap rounded-md bg-(--bg-main) border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] overflow-auto max-h-[80vh]"
				unmountOnHide
				portal
			>
				{content}
			</Ariakit.Tooltip>
		</Ariakit.TooltipProvider>
	)
}
