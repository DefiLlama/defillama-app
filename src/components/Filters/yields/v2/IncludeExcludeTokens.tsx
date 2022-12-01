import { ChangeEvent, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { Search as SearchIcon, X as XIcon } from 'react-feather'
import TokenLogo, { isExternalImage } from '~/components/TokenLogo'
import { useDebounce, useKeyPress, useOnClickOutside } from '~/hooks'

export function IncludeExcludeTokens({ tokens }: { tokens: Array<{ name: string; symbol: string; logo: string }> }) {
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
		<SearchWrapper ref={searchWrapperRef}>
			<SearchIcon size={16} />
			{currentIncludedTokens.map((token) => (
				<IncludeOrExclude key={'includedtokeninsearch' + token} onClick={() => handleTokenInclude(token, 'delete')}>
					<span>{`Include: ${token}`}</span>
					<XIcon size={14} />
				</IncludeOrExclude>
			))}
			{currentExcludedTokens.map((token) => (
				<IncludeOrExclude key={'excludedtokeninsearch' + token} onClick={() => handleTokenExclude(token, 'delete')}>
					<span>{`Exclude: ${token}`}</span>
					<XIcon size={14} />
				</IncludeOrExclude>
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
										<ActionsWrapper>
											<Action onClick={() => handleTokenInclude(token.symbol)}>Include</Action>
											<Action onClick={() => handleTokenExclude(token.symbol)}>Exclude</Action>
										</ActionsWrapper>
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
	)
}

const SearchWrapper = styled.div`
	position: relative;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	position: relative;
	background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
	box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.05);
	border-radius: 8px;
	padding: 8px;
	padding-bottom: 0;

	:focus-within {
		outline: 1px solid ${({ theme }) => theme.text1};
	}

	svg {
		color: #646466;
	}
`

const Input = styled.input`
	flex: 1;
	display: block;
	min-width: 280px;
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
	left: -8px;
	right: -8px;
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

	:hover,
	:focus-visible {
		background-color: ${({ theme }) => theme.bg2};
	}

	& + & {
		border-top: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
	}
`

const ActionsWrapper = styled.div`
	width: 100%;
	display: flex;
	align-items: center;
	flex-wrap: nowrap;
	gap: 4px;
	margin-top: 4px;

	@media screen and (min-width: ${({ theme }) => theme.bpSm}) {
		width: min-content;
		margin-top: 0px;
		margin-left: auto;
	}
`

const Action = styled.button`
	flex: 1;
	border-radius: 8px;
	padding: 8px;
	background: ${({ theme }) => (theme.mode === 'dark' ? '#40444F' : '#dcdcdc')};

	@media screen and (min-width: ${({ theme }) => theme.bpSm}) {
		padding: 4px 8px;
	}
`

const IncludeOrExclude = styled(Action)`
	flex-grow: 0;
	display: flex;
	align-items: center;
	gap: 4px;
	flex-wrap: nowrap;
	padding: 4px 8px;
	white-space: nowrap;
`

const MoreResults = styled.button`
	text-align: left;
	width: 100%;
	padding: 12px 16px;
	margin: 0 -16px;
	color: ${({ theme }) => theme.link};
	background: ${({ theme }) => theme.bg6};
`
