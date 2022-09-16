import * as React from 'react'
import styled from 'styled-components'
import { Tooltip as AriaTooltip, TooltipAnchor, useTooltipState } from 'ariakit/tooltip'
import Link from 'next/link'

interface ITooltip {
	content: string | null
	href?: string
	shallow?: boolean
	onClick?: (e: any) => any
	style?: {}
	children: React.ReactNode
}

const TooltipPopver = styled(AriaTooltip)`
	font-size: 0.85rem;
	padding: 1rem;
	color: ${({ theme }) => (theme.mode === 'dark' ? 'hsl(0, 0%, 100%)' : 'hsl(204, 10%, 10%)')};
	background: ${({ theme }) => (theme.mode === 'dark' ? 'hsl(204, 3%, 12%)' : 'hsl(204, 20%, 100%)')};
	border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'hsl(204, 3%, 32%)' : 'hsl(204, 20%, 88%)')};
	border-radius: 8px;
	filter: ${({ theme }) =>
		theme.mode === 'dark' ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 40%))' : 'drop-shadow(0 4px 6px rgba(0, 0, 0, 15%))'};
	max-width: 228px;
`

export default function Tooltip({ content, href, shallow, onClick, children, ...props }: ITooltip) {
	const tooltip = useTooltipState()

	if (!content || content === '') return <>{children}</>

	const triggerProps = {
		...(onClick && { onClick })
	}

	return (
		<>
			<TooltipAnchor state={tooltip} as={href ? 'div' : 'button'} className="tooltip-trigger" {...triggerProps}>
				{href ? (
					<Link href={href} shallow={shallow} passHref>
						<a>{children}</a>
					</Link>
				) : (
					children
				)}
			</TooltipAnchor>
			<TooltipPopver state={tooltip} {...props}>
				{content}
			</TooltipPopver>
		</>
	)
}
