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
	portal?: boolean
}

export function Tooltip({ content, children, placement = 'top-start', className, ...props }: ITooltip) {
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
				className="z-50 max-h-[80vh] max-w-56 overflow-auto rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) p-2 text-sm whitespace-pre-wrap dark:border-[hsl(204,3%,32%)]"
				unmountOnHide
				portal
			>
				{content}
			</Ariakit.Tooltip>
		</Ariakit.TooltipProvider>
	)
}
