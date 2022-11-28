import { useRouter } from 'next/router'
import { ReactNode, ChangeEvent, useState, useRef, useMemo } from 'react'
import { Search as SearchIcon, X as XIcon } from 'react-feather'
import styled from 'styled-components'
import TokenLogo, { isExternalImage } from '~/components/TokenLogo'
import { useDebounce, useKeyPress, useOnClickOutside } from '~/hooks'

interface IYieldFiltersProps {
	poolsNumber: number
	projectsNumber: number
	chainsNumber: number
	tokens: Array<{ name: string; symbol: string; logo: string }>
	children?: ReactNode
}

export function YieldFiltersV2({ poolsNumber, projectsNumber, chainsNumber, tokens, children }: IYieldFiltersProps) {
	const [resultsLength, setResultsLength] = useState(3)
	const [inputValue, setInputValue] = useState('')
	const [displayResults, setDisplayResults] = useState(false)
	const searchWrapperRef = useRef()

	const router = useRouter()

	const { token, excludeToken } = router.query

	const { currentIncludedTokens, currentExcludedTokens } = useMemo(() => {
		return {
			currentIncludedTokens: token ? (typeof token === 'string' ? [token] : token) : [],
			currentExcludedTokens: excludeToken ? (typeof excludeToken === 'string' ? [excludeToken] : excludeToken) : []
		}
	}, [token, excludeToken])

	useOnClickOutside(searchWrapperRef, () => displayResults && setDisplayResults(false))
	useKeyPress('Escape', () => displayResults && setDisplayResults(false))

	const searchValue = useDebounce(inputValue, 300)

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value)

		if (e.target.value.length > 0 && !displayResults) {
			setDisplayResults(true)
		}
	}

	const showMoreResults = () => {
		setResultsLength((prev) => prev + 5)
	}

	const filteredList = useMemo(() => {
		return tokens.filter((token) => {
			let toFilter = true

			if (currentIncludedTokens.some((x) => x == token.symbol)) {
				toFilter = false
			}

			if (currentExcludedTokens.some((x) => x == token.symbol)) {
				toFilter = false
			}

			if (
				searchValue &&
				searchValue.length > 0 &&
				!(
					token.name.toLowerCase().includes(searchValue.toLowerCase()) ||
					token.symbol.toLowerCase().includes(searchValue.toLowerCase())
				)
			) {
				toFilter = false
			}

			return toFilter
		})
	}, [searchValue, tokens, currentIncludedTokens, currentExcludedTokens])

	const handleTokenInclude = (token: string, action?: 'delete') => {
		const tokens =
			action === 'delete' ? currentIncludedTokens.filter((x) => x != token) : [...currentIncludedTokens, token]

		router.push({ pathname: router.pathname, query: { ...router.query, token: tokens } }, undefined, {
			shallow: true
		})
	}

	const handleTokenExclude = (token: string, action?: 'delete') => {
		const tokens =
			action === 'delete' ? currentExcludedTokens.filter((x) => x != token) : [...currentExcludedTokens, token]

		router.push(
			{
				pathname: router.pathname,
				query: { ...router.query, excludeToken: tokens }
			},
			undefined,
			{
				shallow: true
			}
		)
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
					{currentIncludedTokens.map((token) => (
						<Action
							key={'includedtokeninsearch' + token}
							data-actionoutsidepopover
							onClick={() => handleTokenInclude(token, 'delete')}
						>
							<span>{`Include: ${token}`}</span>
							<XIcon size={12} />
						</Action>
					))}
					{currentExcludedTokens.map((token) => (
						<Action
							key={'excludedtokeninsearch' + token}
							data-actionoutsidepopover
							onClick={() => handleTokenExclude(token, 'delete')}
						>
							<span>{`Exclude: ${token}`}</span>
							<XIcon size={12} />
						</Action>
					))}
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
								{filteredList.length === 0 ? (
									<p data-placeholder>No results found</p>
								) : (
									<>
										{filteredList.slice(0, resultsLength + 1).map((token) => (
											<ResultRow role="row" key={'yieldscgtokenssearch' + token.name + token.symbol}>
												{token?.logo && <TokenLogo logo={token?.logo} external={isExternalImage(token.logo)} />}
												<span>{`${token.name} (${token.symbol})`}</span>
												<Action data-includetoken onClick={() => handleTokenInclude(token.symbol)}>
													Include
												</Action>
												<Action onClick={() => handleTokenExclude(token.symbol)}>Exclude</Action>
											</ResultRow>
										))}

										{resultsLength < filteredList.length && (
											<MoreResults onClick={showMoreResults}>See more...</MoreResults>
										)}
									</>
								)}
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
	background: ${({ theme }) => theme.bg6};
	box-shadow: ${({ theme }) => theme.shadowLg};
	border-radius: 8px;
	z-index: 50;
	height: 100%;
	min-height: 160px;
	max-height: 360px;
	overflow-y: auto;
	overscroll-behavior: contain;
	padding: 0 16px;
	list-style: none;

	& > *[data-placeholder='true'] {
		text-align: center;
		margin-top: 80px;
	}

	@media screen and (min-width: ${({ theme }) => theme.bpMed}) {
		min-height: 200px;

		& > *[data-placeholder='true'] {
			margin-top: 100px;
		}
	}
`

const ResultRow = styled.li`
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4px;
	padding: 12px 16px;
	margin: 0 -16px;
	font-size: 0.85rem;
	color: ${({ theme }) => theme.text1};

	& > * {
		margin-right: 6px;
	}

	:hover,
	:focus-visible {
		background-color: ${({ theme }) => theme.bg2};
	}

	& + & {
		border-top: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
	}
`

const Action = styled.button`
	border-radius: 8px;
	padding: 4px 8px;
	background: ${({ theme }) => (theme.mode === 'dark' ? '#40444F' : '#dcdcdc')};

	&[data-includetoken='true'] {
		margin-left: auto;
	}

	&[data-actionoutsidepopover='true'] {
		display: flex;
		align-items: center;
		flex-wrap: nowrap;

		& + &,
		:first-of-type {
			margin-left: 8px;
		}
	}
`

const MoreResults = styled.button`
	text-align: left;
	width: 100%;
	padding: 12px 16px;
	margin: 0 -16px;
	color: ${({ theme }) => theme.link};
	background: ${({ theme }) => theme.bg6};
`

const FiltersWrapper = styled.div`
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
`
