import { ReactNode, ChangeEvent, useState, useRef } from 'react'
import { Search as SearchIcon } from 'react-feather'
import styled from 'styled-components'
import { useDebounce, useKeyPress, useOnClickOutside } from '~/hooks'

interface IYieldFiltersProps {
	poolsNumber: number
	projectsNumber: number
	chainsNumber: number
	tokens: Array<{ name: string; symbol: string; logo: string }>
	children?: ReactNode
}

export function YieldFiltersV2({ poolsNumber, projectsNumber, chainsNumber, tokens, children }: IYieldFiltersProps) {
	const [inputValue, setInputValue] = useState('')
	const [displayResults, setDisplayResults] = useState(false)
	const searchWrapperRef = useRef()

	useOnClickOutside(searchWrapperRef, () => displayResults && setDisplayResults(false))
	useKeyPress('Escape', () => displayResults && setDisplayResults(false))

	const searchValue = useDebounce(inputValue, 300)

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value)

		if (e.target.value.length > 0 && !displayResults) {
			setDisplayResults(true)
		}
	}

	return (
		<div>
			<Header>
				<h1>Yield Rankings</h1>
				<p>{`Tracking ${poolsNumber} pools over ${projectsNumber} protocols on ${chainsNumber} chains.`}</p>
				<button>Save This Search</button>
			</Header>
			<Wrapper>
				<SearchWrapper ref={searchWrapperRef}>
					<SearchIcon size={16} />
					<Input
						placeholder="Search for a token to filter by"
						role="combobox"
						aria-haspopup="grid"
						aria-expanded="false"
						onFocus={() => setDisplayResults(true)}
						value={inputValue}
						onChange={handleChange}
					/>
					<ResultsWrapper>
						{displayResults && (
							<Results role="grid">
								<li role="row"></li>
							</Results>
						)}
					</ResultsWrapper>
				</SearchWrapper>

				<FiltersWrapper>{children}</FiltersWrapper>
			</Wrapper>
		</div>
	)
}

const Header = styled.div`
	position: relative;
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
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	position: relative;
	background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
	box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.05);
	border-radius: 8px;

	:focus-within {
		outline: 1px solid ${({ theme }) => theme.text1};
	}

	svg {
		color: #646466;
		margin-left: 8px;
	}
`

const Input = styled.input`
	flex: 1;
	display: block;
	min-width: 280px;
	padding: 8px;
	font-size: 0.875rem;
	border: none;
	background: none;
	border-radius: 8px;

	:focus-visible {
		outline: none;
	}
`

const ResultsWrapper = styled.div`
	width: 100%;
	position: relative;
`

const Results = styled.ul`
	position: absolute;
	top: 4px;
	left: 0;
	right: 0;
	padding: 24px;
	background: ${({ theme }) => theme.bg6};
	box-shadow: ${({ theme }) => theme.shadowLg};
	border-radius: 8px;
	z-index: 50;
	height: 100%;
	min-height: 120px;
	max-height: 360px;
	overflow-y: auto;
	overscroll-behavior: contain;
	list-style: none;
`

const FiltersWrapper = styled.div`
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
`
