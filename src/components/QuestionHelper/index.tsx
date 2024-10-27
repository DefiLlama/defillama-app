import * as React from 'react'
import styled from 'styled-components'
import { Tooltip } from '~/components/Tooltip'
import { Icon } from '~/components/Icon'

const IconWrapper = styled(Icon)`
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

export function QuestionHelper({
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
			<IconWrapper name="help-circle" height={16} width={16} {...props} />
		</Tooltip>
	)
}
