import * as React from 'react'
import * as Ariakit from '@ariakit/react'

interface ITooltip {
	content: string | null | React.ReactNode
	href?: string
	shallow?: boolean
	onClick?: (e: any) => any
	children: React.ReactNode
	as?: React.ReactNode
	color?: string
	fontSize?: string
	className?: string
	placement?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ content, children, color, fontSize, placement, className, as, ...props }: ITooltip) {
	if (!content || content === '') return <>{children}</>

	return (
		<Ariakit.TooltipProvider>
			<Ariakit.TooltipAnchor
				className={`cursor-pointer flex items-center overflow-hidden text-ellipsis whitespace-nowrap flex-shrink-0 ${
					className ?? ''
				}`}
				render={<span />}
				{...props}
			>
				{children}
			</Ariakit.TooltipAnchor>

			<Ariakit.Tooltip
				className="text-sm p-2 max-w-56 whitespace-pre-wrap rounded-md bg-[var(--bg1)] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] overflow-auto max-h-[80vh]"
				unmountOnHide
			>
				{content}
			</Ariakit.Tooltip>
		</Ariakit.TooltipProvider>
	)
}

export function Tooltip2({ content, children, className, as, ...props }) {
	return (
		<Ariakit.TooltipProvider>
			<Ariakit.TooltipAnchor render={as ?? <span />} className={className} {...props}>
				{children}
			</Ariakit.TooltipAnchor>

			<Ariakit.Tooltip
				data-tooltipcontent
				className="group text-sm p-2 max-w-56 whitespace-pre-wrap rounded-md bg-[var(--bg1)] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)]"
				unmountOnHide
			>
				{content}
			</Ariakit.Tooltip>
		</Ariakit.TooltipProvider>
	)
}
