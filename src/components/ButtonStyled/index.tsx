import * as React from 'react'
import styled from 'styled-components'
import { darken, transparentize } from 'polished'
import { Icon } from '~/components/Icon'

interface IButtonLightProps {
	useTextColor?: boolean
}

interface IOptionButton {
	active?: boolean
	disabled?: boolean
}

const Base = styled.button`
	padding: 8px 12px;
	font-size: 0.825rem;
	font-weight: 600;
	border-radius: 12px;
`

const Dull = styled(Base)`
	background-color: rgba(255, 255, 255, 0.15);
	border: 1px solid rgba(255, 255, 255, 0.15);
	color: black;
	height: 100%;
	font-weight: 400;
	&:hover,
	:focus-visible {
		background-color: rgba(255, 255, 255, 0.25);
		border-color: rgba(255, 255, 255, 0.25);
	}

	&:focus-visible {
		box-shadow: 0 0 0 1pt rgba(255, 255, 255, 0.25);
	}
	&:active {
		background-color: rgba(255, 255, 255, 0.25);
		border-color: rgba(255, 255, 255, 0.25);
	}
`

export default function ButtonStyled({ children, ...rest }) {
	return <Base {...rest}>{children}</Base>
}

const ContentWrapper = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
`

export const ButtonLight = styled(Base)<IButtonLightProps>`
	background-color: ${({ color, theme }) => (color ? transparentize(0.9, color) : transparentize(0.9, theme.primary1))};
	color: ${({ color, theme, useTextColor }) =>
		useTextColor ? theme.text1 : color ? darken(0.1, color) : theme.primary1};

	min-width: fit-content;
	border-radius: 12px;
	white-space: nowrap;

	a {
		color: ${({ color, theme }) => (color ? darken(0.1, color) : theme.primary1)};
	}

	:hover,
	:focus-visible {
		background-color: ${({ color, theme }) =>
			color ? transparentize(0.8, color) : transparentize(0.8, theme.primary1)};
	}
`

export const ButtonDark = styled(Base)`
	background-color: ${({ color, theme }) => (color ? color : theme.primary1)};
	color: white;
	min-width: fit-content;
	border-radius: 12px;
	white-space: nowrap;

	:hover,
	:focus-visible {
		background-color: ${({ color, theme }) => (color ? darken(0.1, color) : darken(0.1, theme.primary1))};
	}
`

export const ButtonFaded = styled(Base)`
	padding: 8px 4px;
	background-color: ${({ theme }) => theme.bg2};
	color: (255, 255, 255, 0.5);
	white-space: nowrap;

	:hover {
		opacity: 0.5;
	}
`

export function ButtonPlusDull({ disabled = false, children, ...rest }) {
	return (
		<Dull disabled={disabled} {...rest}>
			<ContentWrapper>
				<Icon name="plus" height={16} width={16} />
				<div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
			</ContentWrapper>
		</Dull>
	)
}

export const OptionButton = styled.button<IOptionButton>`
	font-weight: 500;
	width: fit-content;
	white-space: nowrap;
	padding: 6px;
	border-radius: 6px;
	border: 1px solid ${({ theme }) => theme.bg4};
	background: ${({ active, theme }) => (active ? theme.bg3 : 'none')};
	color: ${({ theme }) => theme.text1};

	:hover {
		cursor: ${({ disabled }) => !disabled && 'pointer'};
	}
`
