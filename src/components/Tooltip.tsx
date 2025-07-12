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
	placement?: 'top' | 'bottom' | 'left' | 'right'
	showOnTap?: boolean
}

export function Tooltip({
	content,
	children,
	color,
	fontSize,
	placement,
	className,
	showOnTap,
	onClick,
	...props
}: ITooltip) {
	if (!content || content === '') return <>{children}</>

	const tooltip = Ariakit.useTooltipStore()

	return (
		<Ariakit.TooltipProvider store={tooltip}>
			<Ariakit.TooltipAnchor
				className={`flex items-center overflow-hidden text-ellipsis whitespace-nowrap shrink-0 ${className ?? ''}`}
				render={<span />}
				onClick={onClick ?? (showOnTap ? tooltip.toggle : undefined)}
				onMouseEnter={showOnTap ? undefined : tooltip.show}
				onMouseLeave={showOnTap ? undefined : tooltip.hide}
				{...props}
			>
				{children}
			</Ariakit.TooltipAnchor>

			<Ariakit.Tooltip
				className="text-sm p-2 max-w-56 whitespace-pre-wrap rounded-md bg-(--bg1) border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] overflow-auto max-h-[80vh]"
				unmountOnHide
			>
				{content}
			</Ariakit.Tooltip>
		</Ariakit.TooltipProvider>
	)
}
