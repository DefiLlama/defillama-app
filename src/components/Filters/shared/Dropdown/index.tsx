import { SelectItem } from 'ariakit/select'
import { transparentize } from 'polished'
import styled from 'styled-components'
import { FilterPopover } from '../Base'

export const Dropdown = styled(FilterPopover)`
	max-height: 320px;

	#no-results {
		margin: 24px 0 16px;
	}

	.filter-by-list {
		padding: 0;
	}

	@media screen and (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		width: 100%;
		max-width: 280px;
	}
`

export const MobileDropdown = styled(FilterPopover)``

export const DropdownItem = styled(SelectItem)`
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

	&:first-of-type,
	&:last-of-type {
		border-radius: 0;
	}

	:hover,
	:focus-visible,
	&[data-active-item] {
		outline: none;
		background-color: ${({ theme }) => transparentize(0.8, theme.primary1)};
	}

	opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
`

export const FilterFnsGroup = styled.span`
	display: flex;
	justify-content: space-between;
	flex-wrap: wrap;
	padding: 12px;
	font-size: 0.75rem;
	border-bottom: ${({ theme }) => '1px solid ' + transparentize(0.9, theme.text1)};

	button {
		padding: 4px 0;
		color: ${({ theme }) => theme.primary1};
	}
`

export const ItemsSelected = styled.span`
	position: absolute;
	top: -8px;
	right: -8px;
	font-size: 10px;
	padding: 2px;
	min-width: 16px;
	background: ${({ theme }) => theme.bg4};
	border-radius: 9999px;
`
