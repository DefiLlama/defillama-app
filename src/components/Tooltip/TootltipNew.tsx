import React, { useState } from 'react'
import styled from 'styled-components'

const TooltipWrapper = styled.div`
	position: relative;
	display: inline-block;
`

const TooltipBody = styled.div`
	position: absolute;
	z-index: 1;
	top: calc(100% + 8px);
	left: 50%;
	transform: translateX(-50%);
	border-radius: 10px;
	background-color: ${({ theme }) => (theme.mode === 'dark' ? '#121316' : theme.bg1)};
	padding: 8px;
	border: 1px solid ${({ theme }) => theme.bg4};
`

const Tooltip = ({ children, content }) => {
	const [isTooltipOpen, setIsTooltipOpen] = useState(false)

	const handleMouseEnter = () => {
		setIsTooltipOpen(true)
	}

	const handleMouseLeave = () => {
		setIsTooltipOpen(false)
	}

	return (
		<TooltipWrapper onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
			{children}
			{isTooltipOpen && <TooltipBody>{content}</TooltipBody>}
		</TooltipWrapper>
	)
}

export default Tooltip
