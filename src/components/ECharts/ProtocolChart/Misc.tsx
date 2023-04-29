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
	padding: 6px;
	background-color: ${({ theme, color }) => (color ? transparentize(0.8, color) : transparentize(0.8, theme.primary1))};
	border-radius: 12px;
	width: min-content;
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
