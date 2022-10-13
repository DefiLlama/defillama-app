import styled from 'styled-components'

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
		top: 4px;
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
	left: -8px;
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
