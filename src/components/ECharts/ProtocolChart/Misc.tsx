import { transparentize } from 'polished'
import styled from 'styled-components'

interface IToggleProps {
	backgroundColor?: string
}

export const Toggle = styled.label<IToggleProps>`
	font-size: 0.875rem;
	font-weight: 500;
	cursor: pointer;
	border-radius: 12px;

	input {
		position: absolute;
		width: 1em;
		height: 1em;
		opacity: 0.00001;
	}

	span[data-wrapper='true'] {
		position: relative;
		z-index: 1;
		padding: 8px 12px;
		background: red;
		border-radius: 12px;
		display: flex;
		align-items: center;
		flex-wrap: nowrap;
		gap: 4px;
		background: ${({ backgroundColor, theme }) =>
			backgroundColor ? transparentize(0.8, backgroundColor) : transparentize(0.8, theme.primary1)};
	}

	input:checked + span[data-wrapper='true'] {
		background: ${({ backgroundColor, theme }) =>
			backgroundColor ? transparentize(0.4, backgroundColor) : transparentize(0.4, theme.primary1)};
	}

	input:focus-visible {
		outline: none;
	}

	input:focus-visible + span[data-wrapper='true'] {
		outline: ${({ theme }) => '1px solid ' + theme.text1};
		outline-offset: 1px;
	}

	:hover {
		background: ${({ backgroundColor, theme }) =>
			backgroundColor ? transparentize(0.8, backgroundColor) : transparentize(0.8, theme.primary1)};
	}
`
