import * as React from 'react'
import styled from 'styled-components'
import Tooltip from '~/components/Tooltip'
import { Icon } from '../Icon'

interface IHeadHelpProps {
	title: string
	text: string
	maxCharacters?: string
	adjustSize?: boolean
	fontSize?: string
	link?: boolean
	style?: {}
	headerIsSorted?: boolean
}

interface ITextProps {
	adjustSize: boolean
	link: boolean
	fontSize: string
}

const HeadHelp = ({ title, text, adjustSize = false, fontSize, link, ...props }: IHeadHelpProps) => {
	return (
		<Tooltip content={text} {...props}>
			<TextWrapper adjustSize={adjustSize} link={link} fontSize={fontSize}>
				<span style={{ textAlign: 'center' }}>{title}</span>
				<Icon
					name="help-circle"
					height={15}
					width={15}
					style={{ marginLeft: '.3rem', marginRight: props.headerIsSorted ? '1rem' : undefined }}
				/>
			</TextWrapper>
		</Tooltip>
	)
}

const TextWrapper = styled.div<ITextProps>`
	position: relative;
	color: ${({ theme, link }) => (link ? theme.blue : theme.text1)};
	font-size: ${({ fontSize }) => fontSize ?? 'inherit'};
	display: flex;
	align-items: center;
	white-space: nowrap;
	:hover {
		cursor: pointer;
	}

	@media screen and (max-width: 600px) {
		font-size: ${({ adjustSize }) => adjustSize && '12px'};
	}
`

export default HeadHelp
