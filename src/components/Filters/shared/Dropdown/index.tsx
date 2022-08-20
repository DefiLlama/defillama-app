import { transparentize } from 'polished'
import styled from 'styled-components'
import { FilterItem, FilterPopover } from '~/components/Select/AriakitSelect'

export const Dropdown = styled(FilterPopover)`
	max-height: 320px;

	#no-results {
		margin: 24px 0 16px;
	}

	.filter-by-list {
		padding: 0;
	}

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		width: 100%;
		max-width: 280px;
	}
`

export const Item = styled(FilterItem)`
	&:first-of-type,
	&:last-of-type {
		border-radius: 0;
	}

	opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
`

export const Stats = styled.span`
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

export const Selected = styled.span`
	position: absolute;
	top: -8px;
	right: -8px;
	font-size: 10px;
	padding: 2px;
	min-width: 16px;
	background: ${({ theme }) => theme.bg4};
	border-radius: 9999px;
`
