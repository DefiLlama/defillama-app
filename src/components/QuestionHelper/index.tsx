import * as React from 'react'
import styled from 'styled-components'
import { HelpCircle } from 'react-feather'
import Tooltip from '~/components/Tooltip'

const Question = styled(HelpCircle)`
	height: 16px;
	width: 16px;
	flex-shrink: 0;
	max-width: initial;
	cursor: pointer;
	background-color: ${({ theme }) => theme.bg2};
	color: ${({ theme }) => theme.text2};
	border-radius: 36px;

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
			<Question {...props} />
		</Tooltip>
	)
}
