import { transparentize } from 'polished'
import styled from 'styled-components'

interface IDenomination {
	active?: boolean
}

export const Filters = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 4px;
	background-color: ${({ theme, color }) => (color ? transparentize(0.8, color) : transparentize(0.8, theme.primary1))};
	border-radius: 12px;
	flex-wrap: nowrap;
	overflow-x: auto;
	max-width: calc(100vw - 64px);
	width: fit-content;
`

export const Denomination = styled.a<IDenomination>`
	display: inline-block;
	font-weight: 500;
	font-size: 0.875rem;
	border-radius: 10px;
	background: ${({ theme, active }) =>
		active ? transparentize(0.5, theme.mode === 'dark' ? '#000' : '#fff') : 'none'};
	padding: 6px 8px;
	color: ${({ theme, active }) =>
		active
			? theme.mode === 'dark'
				? '#fff'
				: '#000'
			: theme.mode === 'dark'
			? 'rgba(255, 255, 255, 0.6)'
			: 'rgba(0, 0, 0, 0.6)'};
`

interface IToggleProps {
	backgroundColor?: string
}

export const Toggle = styled.label<IToggleProps>`
	font-size: 0.875rem;
	font-weight: 500;
	cursor: pointer;

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
		border-radius: 10px;
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
`

export const FiltersWrapper = styled.div`
	display: flex;
	flex-direction: column;
	flex-wrap: wrap;
	gap: 16px;
	margin: 0 16px;

	@media screen and (min-width: ${({ theme: { bpSm } }) => bpSm}) {
		flex-wrap: wrap;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
	}
`
