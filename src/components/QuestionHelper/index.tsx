import * as React from 'react'
import styled from 'styled-components'
import { HelpCircle as Question } from 'react-feather'
import Tooltip from '~/components/Tooltip'

const QuestionWrapper = styled.span`
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 36px;
	background-color: ${({ theme }) => theme.bg2};
	color: ${({ theme }) => theme.text2};
	flex-shrink: 0;

	:hover,
	:focus-visible {
		opacity: 0.7;
	}
`

export default function QuestionHelper({
	text,
	disabled,
	textAlign,
	...props
}: {
	text: string
	disabled?: boolean
	style?: {}
	textAlign?: 'left' | 'center' | 'right'
}) {
	return (
		<Tooltip content={disabled ? null : text} style={{ textAlign }}>
			<QuestionWrapper {...props}>
				<Question size={16} />
			</QuestionWrapper>
		</Tooltip>
	)
}
