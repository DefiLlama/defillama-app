import { ReactNode } from 'react'
import { Search } from 'react-feather'
import styled from 'styled-components'

interface IYieldFiltersProps {
	poolsNumber: number
	projectsNumber: number
	chainsNumber: number
	tokens: Array<{ name: string; symbol: string; logo: string }>
	children?: ReactNode
}

export function YieldFiltersV2({ poolsNumber, projectsNumber, chainsNumber, children }: IYieldFiltersProps) {
	return (
		<div>
			<Header>
				<h1>Yield Rankings</h1>
				<p>{`Tracking ${poolsNumber} pools over ${projectsNumber} protocols on ${chainsNumber} chains.`}</p>
				<button>Save This Search</button>
			</Header>
			<Wrapper>
				<SearchWrapper>
					<Search size={16} />
					<Input placeholder="Search for a token to filter by" />
				</SearchWrapper>
				<FiltersWrapper>{children}</FiltersWrapper>
			</Wrapper>
		</div>
	)
}

const Header = styled.div`
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	background: ${({ theme }) => (theme.mode === 'dark' ? 'black' : 'white')};
	padding: 16px;
	border-radius: 12px 12px 0 0;
	border: 1px solid ${({ theme }) => theme.divider};
	border-bottom: 0;

	& > * {
		font-size: 0.875rem;
		font-weight: 400;
	}

	p {
		color: #646466;
	}

	button {
		margin-left: auto;
		color: ${({ theme }) => theme.link};
	}
`

const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 20px;
	padding: 20px 16px 24px;
	background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(246, 246, 246, 0.6)')};
	border-radius: 0 0 12px 12px;
	border: 1px solid ${({ theme }) => theme.divider};
	border-top: 0;
`

const SearchWrapper = styled.div`
	position: relative;

	svg {
		color: #646466;
		position: absolute;
		top: 8px;
		left: 8px;
	}
`

const Input = styled.input`
	width: 100%;
	padding: 8px;
	padding-left: 32px;
	font-size: 0.875rem;
	border: none;
	background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
	box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.05);
	border-radius: 8px;
`

const FiltersWrapper = styled.div`
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
`
