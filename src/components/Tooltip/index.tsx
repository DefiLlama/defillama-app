import * as React from 'react'
import styled from 'styled-components'
import { Button } from 'ariakit/button'
import { Tooltip as AriaTooltip, TooltipAnchor, useTooltipState } from 'ariakit/tooltip'

interface ITooltip {
	content: string | null
	style?: {}
	children: React.ReactNode
}

const TooltipTrigger = styled(Button)`
	color: ${({ theme }) => theme.text1};
	display: flex;
	align-items: center;
	padding: 0;
`

const TooltipPopver = styled(AriaTooltip)`
	font-size: 0.85rem;
	padding: 1em;
	color: ${({ theme }) => (theme.mode === 'dark' ? 'hsl(0, 0%, 100%)' : 'hsl(204, 10%, 10%)')};
	background: ${({ theme }) => (theme.mode === 'dark' ? 'hsl(204, 3%, 12%)' : 'hsl(204, 20%, 100%)')};
	border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'hsl(204, 3%, 32%)' : 'hsl(204, 20%, 88%)')};
	border-radius: 8px;
	filter: ${({ theme }) =>
		theme.mode === 'dark' ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 40%))' : 'drop-shadow(0 4px 6px rgba(0, 0, 0, 15%))'};
	max-width: 228px;
`

export default function Tooltip({ content, children, ...props }: ITooltip) {
	const tooltip = useTooltipState()

	if (!content || content === '') return <>{children}</>

	return (
		<>
			<TooltipAnchor state={tooltip} as={TooltipTrigger}>
				{children}
			</TooltipAnchor>
			<TooltipPopver state={tooltip} {...props}>
				{content}
			</TooltipPopver>
		</>
	)
}
