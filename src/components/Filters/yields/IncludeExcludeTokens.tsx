import { useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { useComboboxState } from 'ariakit'
import styled from 'styled-components'
import { Search, X as XIcon } from 'react-feather'
import TokenLogo from '~/components/TokenLogo'
import { Input } from '~/components/Search/Base/Input'
import { Empty, Popover } from '~/components/Search/Base/Results/Desktop'
import { findActiveItem } from '~/components/Search/Base/utils'

export function IncludeExcludeTokens({
	tokens,
	...props
}: {
	tokens: Array<{ name: string; symbol: string; logo?: string | null; fallbackLogo?: string | null }>
}) {
	const [resultsLength, setResultsLength] = useState(3)

	const searchWrapperRef = useRef()

	const router = useRouter()

	const { token, excludeToken, exactToken } = router.query

	const tokensToInclude = token ? (typeof token === 'string' ? [token] : [...token]) : []
	const tokensToExclude = excludeToken ? (typeof excludeToken === 'string' ? [excludeToken] : [...excludeToken]) : []
	const tokensThatMatchExactly = exactToken ? (typeof exactToken === 'string' ? [exactToken] : [...exactToken]) : []

	const showMoreResults = () => {
		setResultsLength((prev) => prev + 5)
	}

	const combobox = useComboboxState({
		gutter: 6,
		sameWidth: true,
		list: tokens.map((x) => x.symbol)
	})

	// select first item on open
	const item = findActiveItem(combobox)
	const firstId = combobox.first()

	if (combobox.open && !item && firstId) {
		combobox.setActiveId(firstId)
	}

	const handleTokenInclude = (token: string, action?: 'delete') => {
		const tokenQueryParams =
			action === 'delete' ? tokensToInclude.filter((x) => x !== token) : [...tokensToInclude, token]

		router.push({ pathname: router.pathname, query: { ...router.query, token: tokenQueryParams } }, undefined, {
			shallow: true
		})
	}

	const handleTokenExclude = (token: string, action?: 'delete') => {
		const tokenQueryParams =
			action === 'delete' ? tokensToExclude.filter((x) => x !== token) : [...tokensToExclude, token]

		router.push({ pathname: router.pathname, query: { ...router.query, excludeToken: tokenQueryParams } }, undefined, {
			shallow: true
		})
	}

	const handleTokenExact = (token: string, action?: 'delete') => {
		const tokenQueryParams =
			action === 'delete' ? tokensThatMatchExactly.filter((x) => x !== token) : [...tokensThatMatchExactly, token]

		router.push({ pathname: router.pathname, query: { ...router.query, exactToken: tokenQueryParams } }, undefined, {
			shallow: true
		})
	}

	const options = combobox.matches
		.filter((t) => !tokensToInclude.includes(t) && !tokensToExclude.includes(t))
		.map((o) => tokens.find((x) => x.symbol === o))

	return (
		<SearchWrapper ref={searchWrapperRef} {...props}>
			{(tokensToInclude.length > 0 || tokensToExclude.length > 0) && (
				<OptionsWrapper>
					{tokensToInclude.map((token) => (
						<IncludeOrExclude key={'includedtokeninsearch' + token} onClick={() => handleTokenInclude(token, 'delete')}>
							<span>{`Include: ${token}`}</span>
							<XIcon size={14} />
						</IncludeOrExclude>
					))}

					{tokensToExclude.map((token) => (
						<IncludeOrExclude key={'excludedtokeninsearch' + token} onClick={() => handleTokenExclude(token, 'delete')}>
							<span>{`Exclude: ${token}`}</span>
							<XIcon size={14} />
						</IncludeOrExclude>
					))}

					{tokensThatMatchExactly.map((token) => (
						<IncludeOrExclude key={'exacttokensinsearch' + token} onClick={() => handleTokenExact(token, 'delete')}>
							<span>{`Exact: ${token}`}</span>
							<XIcon size={14} />
						</IncludeOrExclude>
					))}
				</OptionsWrapper>
			)}

			<InputWrapper>
				<SearchIcon size={16} />
				<Input state={combobox} placeholder="Search for a token to filter by" hideIcon />
			</InputWrapper>

			<StyledPopover state={combobox}>
				{!combobox.mounted ? (
					<Empty>Loading...</Empty>
				) : combobox.matches.length ? (
					<>
						{options.slice(0, resultsLength + 1).map((token) => (
							<ResultRow key={token.name} onClick={() => handleTokenInclude(token.symbol)}>
								{(token?.logo || token?.fallbackLogo) && (
									<TokenLogo logo={token?.logo} fallbackLogo={token?.fallbackLogo} />
								)}
								<span>{`${token.name} (${token.symbol})`}</span>
								<ActionsWrapper>
									<Action
										onClick={(e) => {
											e.stopPropagation()

											handleTokenInclude(token.symbol)
										}}
									>
										Include
									</Action>
									<Action
										onClick={(e) => {
											e.stopPropagation()

											handleTokenExclude(token.symbol)
										}}
									>
										Exclude
									</Action>

									<Action
										onClick={(e) => {
											e.stopPropagation()

											handleTokenExact(token.symbol)
										}}
									>
										Exact
									</Action>
								</ActionsWrapper>
							</ResultRow>
						))}

						{resultsLength < combobox.matches.length && (
							<MoreResults onClick={showMoreResults}>See more...</MoreResults>
						)}
					</>
				) : (
					<Empty>No results found</Empty>
				)}
			</StyledPopover>
		</SearchWrapper>
	)
}

const OptionsWrapper = styled.div`
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4px;
	padding: 0 8px;
`

const SearchWrapper = styled.div`
	position: relative;
	display: none;
	flex-direction: column;
	gap: 8px;
	background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
	border-radius: 8px;
	padding: 8px 0;

	:focus-within {
		outline: 1px solid ${({ theme }) => theme.text1};
	}

	&[data-alwaysdisplay='true'] {
		display: flex;

		svg {
			display: block;
		}
	}

	svg {
		color: #646466;
	}

	@media screen and (min-width: ${({ theme }) => theme.bpSm}) {
		display: flex;
	}
`

const StyledPopover = styled(Popover)`
	left: 0;
	right: 0;
	top: 12px;
	border-radius: 8px;
`

const SearchIcon = styled(Search)`
	position: absolute;
	left: 8px;

	@media screen and (max-width: ${({ theme }) => theme.bpSm}) {
		display: none;

		&[data-alwaysdisplay='true'] {
			display: block;
		}
	}
`

const InputWrapper = styled.div`
	& *:nth-child(2) {
		width: 100%;
		font-size: 0.875rem;
		border: none;
		background: none;
		border-radius: 8px;
		padding: 0 32px;

		:focus-visible {
			outline: none;
		}
	}
`

const ResultRow = styled.div`
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4px;
	padding: 8px;
	font-size: 0.85rem;
	color: ${({ theme }) => theme.text1};
	overflow: hidden;

	:hover,
	:focus-visible {
		background-color: ${({ theme }) => theme.bg2};
	}

	& + & {
		border-top: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
	}

	@media screen and (min-width: ${({ theme }) => theme.bpSm}) {
		padding: 12px 16px;
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

const IncludeOrExclude = styled.button`
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 4px;
	flex-wrap: nowrap;
	padding: 4px 8px;
	white-space: nowrap;
	border-radius: 8px;
	background: ${({ theme }) => (theme.mode === 'dark' ? '#40444F' : '#dcdcdc')};

	svg {
		flex-shrink: 0;
	}
`

export const MoreResults = styled.button`
	text-align: left;
	width: 100%;
	padding: 12px 16px;
	color: ${({ theme }) => theme.link};
	background: ${({ theme }) => theme.bg6};
	border-top: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
`
