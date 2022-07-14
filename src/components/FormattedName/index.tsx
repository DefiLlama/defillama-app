import * as React from 'react'
import styled from 'styled-components'
import Tooltip from '~/components/Tooltip'

interface WrapperProps {
	margin?: string | boolean
	link?: boolean
	adjustSize?: boolean
	fontSize?: string | number
	fontWeight?: number
	maxCharacters?: number
}

interface IFormattedNameProps extends WrapperProps {
	text: string
}

const TextWrapper = styled.span<WrapperProps>`
	position: relative;
	top: 1px;
	margin-left: ${({ margin }) => margin && '4px'};
	color: ${({ theme, link }) => (link ? theme.blue : theme.text1)};
	font-size: ${({ fontSize }) => fontSize ?? 'inherit'};
	font-weight: ${({ fontWeight }) => fontWeight};

	:hover {
		cursor: pointer;
	}

	@media screen and (max-width: 600px) {
		font-size: ${({ adjustSize }) => adjustSize && '12px'};
	}
`

const FormattedName = ({
	text,
	maxCharacters,
	margin = false,
	adjustSize = false,
	fontSize,
	fontWeight = 400,
	link,
	...rest
}: IFormattedNameProps) => {
	if (!text) {
		return null
	}

	if (text.length > maxCharacters) {
		return (
			<Tooltip content={text}>
				<TextWrapper margin={margin} adjustSize={adjustSize} link={link} fontSize={fontSize} {...rest}>
					{' ' + text.slice(0, maxCharacters - 1) + '...'}
				</TextWrapper>
			</Tooltip>
		)
	}

	return (
		<TextWrapper
			margin={margin}
			adjustSize={adjustSize}
			link={link}
			fontSize={fontSize}
			fontWeight={fontWeight}
			{...rest}
		>
			{text}
		</TextWrapper>
	)
}

export default FormattedName
