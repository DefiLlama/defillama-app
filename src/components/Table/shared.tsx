import styled from 'styled-components'
import { Icon } from '~/components/Icon'

interface INameProps {
	depth?: number
}

export const Name = styled.span<INameProps>`
	display: flex;
	align-items: center;
	gap: 8px;
	padding-left: ${({ depth }) => (depth ? depth * 48 : depth === 0 ? 24 : 0)}px;
	position: relative;

	& > *[data-bookmark] {
		position: absolute;
		left: -2px;
	}

	a {
		overflow: hidden;
		text-overflow: ellipsis;
		whitespace: nowrap;
	}

	a:hover {
		text-decoration: underline;
	}

	& > *[data-lgonly] {
		display: none;
	}

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		& > *[data-lgonly] {
			display: flex;
		}
	}
`
export const AccordionButton = styled.button`
	position: absolute;
	left: -2px;
`

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
	gap: 12px;
`

export const TableHeader = styled.h1`
	margin: 0 auto 0 0;
	font-weight: 500;
	font-size: 1.125rem;
`

export const PoolStrategyWithProjects = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;
	font-size: 12px;

	img {
		height: 16px;
		width: 16px;
	}
`

export const TableHeaderAndSearch = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20px;
`
export const SearchWrapper = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	position: relative;
	bottom: -6px;
	margin-left: auto;

	input {
		width: 100%;
		margin-right: auto;
		border-radius: 8px;
		padding: 8px;
		padding-left: 32px;
		background: ${({ theme }) => (theme.mode === 'dark' ? '#000' : '#fff')};

		font-size: 0.875rem;
		border: none;
	}

	@media screen and (min-width: ${({ theme: { bpSm } }) => bpSm}) {
		input {
			max-width: 400px;
		}
	}
`

const SearchIconWrapper = styled(Icon)`
	position: absolute;
	top: 8px;
	left: 8px;
	color: ${({ theme }) => theme.text3};
`

export const SearchIcon = ({ size }: { size?: number }) => {
	return <SearchIconWrapper name="search" height={size ?? 16} width={size ?? 16} />
}

const CalendarIconWrapper = styled(Icon)`
	position: absolute;
	top: 8px;
	left: 8px;
	color: ${({ theme }) => theme.text3};
`

export const CalendarIcon = ({ size }: { size?: number }) => (
	<CalendarIconWrapper name="calendar" height={size ?? 16} width={size ?? 16} />
)

export const TableFiltersWithInput = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	margin: 0 0 -10px;
	position: relative;

	input {
		width: 100%;
		margin-right: auto;
		border-radius: 8px;
		padding: 8px;
		padding-left: 32px;
		background: ${({ theme }) => (theme.mode === 'dark' ? '#000' : '#fff')};

		font-size: 0.875rem;
		border: none;
	}

	@media screen and (min-width: ${({ theme: { bpSm } }) => bpSm}) {
		input {
			max-width: 400px;
		}
	}
`
