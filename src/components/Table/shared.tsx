import styled from 'styled-components'

export const TableFilters = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 20px;
	margin: 0 0 -20px;
`

export const Dropdowns = styled.span`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 20px;
`

export const TableHeader = styled.h1`
	margin: 0 auto 0 0;
	font-weight: 500;
	font-size: 1.125rem;
`

export const RowWrapper = styled.tr`
	border-bottom: 1px solid;
	border-color: ${({ theme }) => theme.divider};
	--padding-left: 20px;

	& > * {
		padding: 12px 0;
		padding-left: var(--gap);
		text-align: var(--text-align);
	}

	& > :first-child {
		white-space: nowrap;
		text-align: start;
		padding-left: var(--padding-left);
	}

	& > :last-child {
		padding-right: 20px;
	}

	& > *:not(:first-child),
	& > *:not(:first-child) > * {
		margin-left: auto;
		text-align: right;
	}

	td:not(:first-child),
	td:not(:first-child) > * {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipses;
	}

	a:hover {
		filter: brightness(1.5);
		text-decoration: underline;
	}
`

export const Cell = styled.td`
	font-size: 14px;
`
