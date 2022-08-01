import { Select as AriaSelect, SelectItem, SelectPopover } from 'ariakit/select'
import { transparentize } from 'polished'
import styled from 'styled-components'

export const SelectMenu = styled(AriaSelect)`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	background: ${({ theme }) => theme.bg6};
	color: ${({ theme }) => theme.text1};
	padding: 12px;
	border-radius: 12px;
	border: none;
	margin: 0;
	width: 200px;

	& > *:first-child {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:focus-visible,
	&[data-focus-visible] {
		outline: ${({ theme }) => '1px solid ' + theme.text1};
	}
`
export const Popover = styled(SelectPopover)`
	display: flex;
	flex-direction: column;
	overscroll-behavior: contain;
	filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 15%));
	overflow: auto;
	background: ${({ theme }) => theme.bg6};
	color: ${({ theme }) => theme.text1};
	border-bottom-left-radius: 12px;
	border-bottom-right-radius: 12px;
	box-shadow: ${({ theme }) => theme.shadowLg};
	margin: 0;
	z-index: 10;
	outline: ${({ theme }) => '1px solid ' + theme.text5};
	color: ${({ theme }) => (theme.mode === 'dark' ? 'hsl(0, 0%, 100%)' : 'hsl(204, 10%, 10%)')};
	background: ${({ theme }) => (theme.mode === 'dark' ? 'hsl(204, 3%, 12%)' : 'hsl(204, 20%, 100%)')};
	border-radius: 8px;
	filter: ${({ theme }) =>
		theme.mode === 'dark' ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 40%))' : 'drop-shadow(0 4px 6px rgba(0, 0, 0, 15%))'};
`
export const Item = styled(SelectItem)`
	padding: 12px 4px;
	display: flex;
	align-items: center;
	gap: 4px;
	cursor: pointer;

	:hover,
	&[data-focus-visible] {
		outline: none;
		background: ${({ theme }) => theme.bg3};
	}

	&:last-of-type {
		border-radius: 0 0 12px 12px;
	}
`

export const FilterItem = styled(SelectItem)`
	padding: 8px 12px;
	color: ${({ theme }) => theme.text1};
	cursor: pointer;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	background: none;
	border: none;
	text-align: start;
	display: flex;
	align-items: center;
	border-bottom: ${({ theme }) => '1px solid ' + transparentize(0.9, theme.text1)};

	&:first-of-type {
		padding-top: 12px;
		border-radius: 8px 8px 0 0;
	}
	&:last-of-type {
		padding-bottom: 12px;
		border-radius: 0 0 8px 8px;
		border: none;
	}

	:hover,
	:focus-visible,
	&[data-active-item] {
		outline: none;
		background-color: ${({ theme }) => transparentize(0.8, theme.primary1)};
	}
`

export const FilterPopover = styled(SelectPopover)`
	min-width: 180px;
	outline: none !important;
	position: relative;
	z-index: 50;
	display: flex;
	flex-direction: column;
	overscroll-behavior: contain;
	font-size: 0.825rem;
	color: ${({ theme }) => theme.text1};
	background: ${({ theme }) => (theme.mode === 'dark' ? '#1c1f2d' : '#f4f6ff')};
	border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#40444f' : '#cbcbcb')};
	filter: ${({ theme }) =>
		theme.mode === 'dark'
			? 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 40%))'
			: 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 15%))'};
	border-radius: 8px;
	z-index: 100;
	max-height: 400px;
	overflow: visible;

	#no-results {
		padding: 0 12px 8px;
		text-align: center;
	}
`

export const FilterButton = styled(AriaSelect)`
	position: relative;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 8px 12px;
	font-size: 0.825rem;
	border-radius: 8px;
	cursor: pointer;
	outline: none;
	border: 1px solid transparent;
	background-color: ${({ color, theme }) => transparentize(0.9, color || theme.primary1)};
	color: ${({ theme }) => theme.text1};

	white-space: nowrap;

	:hover,
	:focus-visible {
		background-color: ${({ color, theme }) => transparentize(0.8, color || theme.primary1)};
	}

	:focus-visible {
		outline: ${({ theme }) => '1px solid ' + theme.text1};
		outline-offset: 1px;
	}

	span:first-of-type {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	svg {
		position: relative;
		top: 1px;
	}
`
