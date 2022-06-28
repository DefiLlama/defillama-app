import { Combobox, ComboboxItem, ComboboxList } from 'ariakit/combobox'
import { transparentize } from 'polished'
import styled from 'styled-components'

export const Input = styled(Combobox)`
	background: ${({ theme }) => (theme.mode === 'dark' ? '#000' : '#fff')};
	color: ${({ theme }) => theme.text1};
	font: inherit;
	padding: 8px 12px;
	border: ${({ theme }) => '1px solid ' + theme.text4};
	border-radius: 8px;
	margin: 12px 12px 0;

	:focus-visible {
		outline: ${({ theme }) => '1px solid ' + theme.text1};
	}
`

export const List = styled(ComboboxList)`
	overflow: auto;
	overscroll-behavior: contain;
	padding: 8px 0;
`

export const Item = styled(ComboboxItem)`
	padding: 8px 12px;
	color: ${({ theme }) => theme.text1};
	cursor: pointer;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	background: none;
	border: none;
	text-align: start;

	:hover,
	:focus-visible,
	&[data-active-item] {
		outline: none;
		background-color: ${({ theme }) => transparentize(0.8, theme.primary1)};
	}
`
