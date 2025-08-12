import { useState, useMemo, startTransition, useDeferredValue } from 'react'
import { useRouter } from 'next/router'
import { TokenLogo } from '~/components/TokenLogo'
import { Icon } from '~/components/Icon'
import { matchSorter } from 'match-sorter'
import * as Ariakit from '@ariakit/react'

export function IncludeExcludeTokens({
	tokens,
	...props
}: {
	tokens: Array<{ name: string; symbol: string; logo?: string | null; fallbackLogo?: string | null }>
}) {
	const router = useRouter()

	const { token, excludeToken, exactToken, token_pair } = router.query

	const tokensToInclude = token ? (typeof token === 'string' ? [token] : [...token]) : []
	const tokensToExclude = excludeToken ? (typeof excludeToken === 'string' ? [excludeToken] : [...excludeToken]) : []
	const tokensThatMatchExactly = exactToken ? (typeof exactToken === 'string' ? [exactToken] : [...exactToken]) : []
	const pairTokens = token_pair ? (typeof token_pair === 'string' ? [token_pair] : [...token_pair]) : []

	const dialogStore = Ariakit.useDialogStore()

	const [tab, setTab] = useState<'Tokens' | 'Pairs'>('Tokens')

	const handleTokenInclude = (token: string, action?: 'delete') => {
		const tokenQueryParams =
			action === 'delete' ? tokensToInclude.filter((x) => x !== token) : [...tokensToInclude, token]

		router
			.push({ pathname: router.pathname, query: { ...router.query, token: tokenQueryParams } }, undefined, {
				shallow: true
			})
			.then(() => {
				dialogStore.toggle()
			})
	}

	const handleTokenExclude = (token: string, action?: 'delete') => {
		const tokenQueryParams =
			action === 'delete' ? tokensToExclude.filter((x) => x !== token) : [...tokensToExclude, token]

		router
			.push({ pathname: router.pathname, query: { ...router.query, excludeToken: tokenQueryParams } }, undefined, {
				shallow: true
			})
			.then(() => {
				dialogStore.toggle()
			})
	}

	const handleTokenExact = (token: string, action?: 'delete') => {
		const tokenQueryParams =
			action === 'delete' ? tokensThatMatchExactly.filter((x) => x !== token) : [...tokensThatMatchExactly, token]

		router
			.push({ pathname: router.pathname, query: { ...router.query, exactToken: tokenQueryParams } }, undefined, {
				shallow: true
			})
			.then(() => {
				dialogStore.toggle()
			})
	}

	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)
	const matches = useMemo(() => {
		return matchSorter(
			tokens as Array<{ name: string; symbol: string; logo?: string; fallbackLogo?: string }>,
			deferredSearchValue,
			{
				baseSort: (a, b) => (a.index < b.index ? -1 : 1),
				keys: [(item) => item.name.replace('₮', 'T'), (item) => item.symbol.replace('₮', 'T')],
				threshold: matchSorter.rankings.CONTAINS
			}
		)
	}, [tokens, deferredSearchValue])

	const [viewableMatches, setViewableMatches] = useState(20)

	const [newPairTokens, setNewPairTokens] = useState<Array<string>>([])

	const handlePairTokens = (pair: string, action?: 'delete') => {
		const pairQueryParams = action === 'delete' ? pairTokens.filter((x) => x !== pair) : [...pairTokens, pair]

		router.push({ pathname: router.pathname, query: { ...router.query, token_pair: pairQueryParams } }, undefined, {
			shallow: true
		})
	}

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<div
				className="relative hidden sm:flex flex-col rounded-md text-xs data-[alwaysdisplay=true]:flex bg-(--btn-bg)"
				{...props}
			>
				{(tokensToInclude.length > 0 ||
					tokensToExclude.length > 0 ||
					tokensThatMatchExactly.length > 0 ||
					pairTokens.length > 0) && (
					<div className="flex items-center flex-wrap gap-4 p-2">
						{tokensToInclude.map((token) => (
							<button
								key={'includedtokeninsearch' + token}
								onClick={() => handleTokenInclude(token, 'delete')}
								className="flex items-center gap-1 flex-nowrap py-1 px-2 whitespace-nowrap rounded-md text-[#007c00] dark:text-[#00ab00] dark:bg-[#18221d] bg-[#e4efe2]"
							>
								<span>{`Include: ${token}`}</span>
								<Icon name="x" height={14} width={14} />
							</button>
						))}

						{tokensToExclude.map((token) => (
							<button
								key={'excludedtokeninsearch' + token}
								onClick={() => handleTokenExclude(token, 'delete')}
								className="flex items-center gap-1 flex-nowrap py-1 px-2 whitespace-nowrap rounded-md text-[#dc2626] dark:text-[#ef4444] dark:bg-[#1f1b1b] bg-[#fef2f2]"
							>
								<span>{`Exclude: ${token}`}</span>
								<Icon name="x" height={14} width={14} />
							</button>
						))}

						{tokensThatMatchExactly.map((token) => (
							<button
								key={'exacttokensinsearch' + token}
								onClick={() => handleTokenExact(token, 'delete')}
								className="flex items-center gap-1 flex-nowrap py-1 px-2 whitespace-nowrap rounded-md text-(--link-text) bg-(--link-bg)"
							>
								<span>{`Exact: ${token}`}</span>
								<Icon name="x" height={14} width={14} />
							</button>
						))}

						{pairTokens.map((token) => (
							<button
								key={'pairtokensinsearch' + token}
								onClick={() => handlePairTokens(token, 'delete')}
								className="flex items-center gap-1 flex-nowrap py-1 px-2 whitespace-nowrap rounded-md text-[#ea580c] dark:text-[#fb923c] dark:bg-[#1f1b1b] bg-[#fff7ed]"
							>
								<span>{`Pair: ${token}`}</span>
								<Icon name="x" height={14} width={14} />
							</button>
						))}
					</div>
				)}
				<Ariakit.DialogDisclosure className="flex items-center gap-2 p-2">
					<Icon name="search" height={16} width={16} />
					<span>Search for a token to filter by</span>
				</Ariakit.DialogDisclosure>
			</div>
			<Ariakit.Dialog className="dialog sm:h-[70vh]">
				<div className="flex items-center gap-2">
					<Ariakit.DialogHeading className="text-lg font-bold">Search for</Ariakit.DialogHeading>
					<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border-[#E2E2E2] bg-[#E2E2E2] dark:bg-[#2A2C2E] dark:border-[#2A2C2E] p-1">
						{['Tokens', 'Pairs'].map((dataType) => (
							<button
								onClick={() => {
									setTab(dataType as 'Tokens' | 'Pairs')
									setSearchValue('')
								}}
								className="shrink-0 py-1 px-[10px] whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white rounded-md"
								data-active={tab === dataType}
								key={dataType}
							>
								{dataType}
							</button>
						))}
					</div>
					<Ariakit.DialogDismiss
						className="ml-auto p-2 -my-2 rounded-lg hover:bg-(--divider) text-(--text3) hover:text-(--text1)"
						aria-label="Close modal"
						onClick={() => {
							setNewPairTokens([])
							setTab('Tokens')
							setSearchValue('')
						}}
					>
						<Icon name="x" height={20} width={20} />
					</Ariakit.DialogDismiss>
				</div>
				{tab === 'Tokens' ? (
					<>
						<Ariakit.ComboboxProvider
							setValue={(value) => {
								startTransition(() => {
									setSearchValue(value)
								})
							}}
						>
							<div className="relative">
								<Icon
									name="search"
									height={16}
									width={16}
									className="absolute text-(--text3) top-0 bottom-0 my-auto left-2"
								/>
								<Ariakit.Combobox
									autoSelect
									autoFocus
									placeholder="Search for a token to filter by..."
									className="w-full border-[#E2E2E2] bg-[#E2E2E2] dark:bg-[#2A2C2E] dark:border-[#2A2C2E] p-[6px] pl-7 min-h-8 text-black dark:text-white placeholder:text-[#666] dark:placeholder:[#919296] rounded-md outline-hidden"
								/>
							</div>
							{matches.length ? (
								<div className="flex flex-col gap-2">
									{matches.slice(0, viewableMatches + 1).map((token) => (
										<Ariakit.ComboboxItem
											key={token.name}
											onClick={() => {
												handleTokenInclude(token.symbol)
											}}
											className="flex items-center flex-wrap gap-1 p-2 text-sm overflow-hidden bg-(--cards-bg) hover:bg-[rgba(31,103,210,0.12)] py-2 px-4 rounded-md cursor-pointer"
										>
											{(token?.logo || token?.fallbackLogo) && (
												<TokenLogo logo={token?.logo} fallbackLogo={token?.fallbackLogo} />
											)}
											<span>{`${token.symbol}`}</span>
											<div className="w-full sm:w-min flex items-center flex-nowrap gap-1 mt-1 sm:mt-0 sm:ml-auto">
												<button
													onClick={(e) => {
														e.stopPropagation()
														handleTokenInclude(token.symbol)
													}}
													className="flex-1 rounded-md sm:py-1 sm:px-2 text-[#007c00] dark:text-[#00ab00] dark:bg-[#18221d] bg-[#e4efe2]"
												>
													Include
												</button>
												<button
													onClick={(e) => {
														e.stopPropagation()
														handleTokenExclude(token.symbol)
													}}
													className="flex-1 rounded-md sm:py-1 sm:px-2 text-[#dc2626] dark:text-[#ef4444] dark:bg-[#1f1b1b] bg-[#fef2f2]"
												>
													Exclude
												</button>

												<button
													onClick={(e) => {
														e.stopPropagation()
														handleTokenExact(token.symbol)
													}}
													className="flex-1 rounded-md sm:py-1 sm:px-2 text-(--link-text) bg-(--link-bg)"
												>
													Exact
												</button>
											</div>
										</Ariakit.ComboboxItem>
									))}

									{matches.length > viewableMatches ? (
										<button
											onClick={() => setViewableMatches((prev) => prev + 20)}
											className="text-left w-full pt-4 px-4 pb-7 text-(--link) hover:bg-(--bg2) focus-visible:bg-(--bg2) rounded-md"
										>
											See more...
										</button>
									) : null}
								</div>
							) : (
								<p className="text-(--text1) py-6 px-3 text-center">No results found</p>
							)}
						</Ariakit.ComboboxProvider>
					</>
				) : (
					<>
						<div className="flex items-center gap-2 -mb-4">
							<span>Current pair:</span>
							<span>{newPairTokens.join('-')}</span>
						</div>
						<Ariakit.ComboboxProvider
							value={searchValue}
							setValue={(value) => {
								startTransition(() => {
									setSearchValue(value)
								})
							}}
						>
							<div className="relative">
								<Icon
									name="search"
									height={16}
									width={16}
									className="absolute text-(--text3) top-0 bottom-0 my-auto left-2"
								/>
								<Ariakit.Combobox
									autoSelect
									autoFocus
									placeholder="Search for a token to add to current pair..."
									className="w-full border-[#E2E2E2] bg-[#E2E2E2] dark:bg-[#2A2C2E] dark:border-[#2A2C2E] p-[6px] pl-7 min-h-8 text-black dark:text-white placeholder:text-[#666] dark:placeholder:[#919296] rounded-md outline-hidden"
								/>
							</div>
							{matches.length ? (
								<div className="flex flex-col gap-2">
									{matches.slice(0, viewableMatches + 1).map((token) => (
										<Ariakit.ComboboxItem
											key={token.name}
											onClick={() => {
												setNewPairTokens((prev) => [...prev, token.symbol])
												setSearchValue('')
												// scroll to top of dialog
												const dialogElement = dialogStore.getState().contentElement
												if (dialogElement) {
													dialogElement.scrollTo({ top: 0, behavior: 'smooth' })
												}
											}}
											className="flex items-center flex-wrap gap-1 p-2 text-sm overflow-hidden bg-(--cards-bg) hover:bg-[rgba(31,103,210,0.12)] py-2 px-4 rounded-md cursor-pointer"
										>
											{(token?.logo || token?.fallbackLogo) && (
												<TokenLogo logo={token?.logo} fallbackLogo={token?.fallbackLogo} />
											)}
											<span>{`${token.symbol}`}</span>
										</Ariakit.ComboboxItem>
									))}

									{matches.length > viewableMatches ? (
										<button
											onClick={() => setViewableMatches((prev) => prev + 20)}
											className="text-left w-full pt-4 px-4 pb-7 text-(--link) hover:bg-(--bg2) focus-visible:bg-(--bg2) rounded-md"
										>
											See more...
										</button>
									) : null}

									<button
										className="w-full rounded-md bg-(--old-blue) text-white py-2 sticky bottom-0 disabled:text-opacity-50 disabled:cursor-not-allowed"
										onClick={() => {
											handlePairTokens(newPairTokens.join('-'))
											dialogStore.toggle()
											setNewPairTokens([])
											setTab('Tokens')
											setSearchValue('')
										}}
										disabled={newPairTokens.length < 2}
									>
										Confirm
									</button>
								</div>
							) : (
								<p className="text-(--text1) py-6 px-3 text-center">No results found</p>
							)}
						</Ariakit.ComboboxProvider>
					</>
				)}
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
