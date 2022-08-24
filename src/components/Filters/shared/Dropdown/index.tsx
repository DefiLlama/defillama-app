import { SelectItem } from 'ariakit/select'
import { transparentize } from 'polished'
import styled from 'styled-components'
import { FilterPopover } from '../Base'

export const ComboboxDropdown = styled(FilterPopover)`
	height: 60vh;
	#no-results {
		margin: 24px 0;
	}

	.filter-by-list {
		padding: 0;
	}

	@media screen and (min-width: 640px) {
		height: unset;
	}
`

export const DropdownItem = styled(SelectItem)`
	flex-shrink: 0;
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

	&:first-of-type {
		padding-top: 16px;
	}

	&:last-of-type {
		padding-bottom: 24px;
	}

	&:first-of-type,
	&:last-of-type {
		border-radius: 0;
	}

	opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};

	@media screen and (min-width: 640px) {
		border-bottom: ${({ theme }) => '1px solid ' + transparentize(0.9, theme.text1)};

		:hover,
		:focus-visible,
		&[data-active-item] {
			outline: none;
			background-color: ${({ theme }) => transparentize(0.8, theme.primary1)};
		}

		&:first-of-type {
			padding-top: 12px;
		}

		&:last-of-type {
			padding-bottom: 12px;
			border: none;
		}
	}
`

export const FilterFnsGroup = styled.span`
	position: sticky;
	top: 0;
	display: flex;
	justify-content: space-between;
	flex-wrap: wrap;
	padding: 12px;
	font-size: 0.75rem;
	background: ${({ theme }) => theme.bg1};
	border-bottom: ${({ theme }) => '1px solid ' + transparentize(0.9, theme.text1)};
	z-index: 1;

	button {
		padding: 4px 0;
		color: ${({ theme }) => theme.primary1};
	}

	@media screen and (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		background: ${({ theme }) => (theme.mode === 'dark' ? '#1c1f2d' : '#f4f6ff')};
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
