import { startTransition, useDeferredValue, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'

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
		if (!deferredSearchValue) return tokens
		return matchSorter(tokens, deferredSearchValue, {
			keys: [(item) => item.name.replace('₮', 'T'), (item) => item.symbol.replace('₮', 'T')],
			threshold: matchSorter.rankings.CONTAINS
		})
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
				className="relative hidden flex-col rounded-md bg-(--btn-bg) text-xs data-[alwaysdisplay=true]:flex sm:flex"
				{...props}
			>
				{(tokensToInclude.length > 0 ||
					tokensToExclude.length > 0 ||
					tokensThatMatchExactly.length > 0 ||
					pairTokens.length > 0) && (
					<div className="flex flex-wrap items-center gap-4 p-2">
						{tokensToInclude.map((token) => (
							<button
								key={'includedtokeninsearch' + token}
								onClick={() => handleTokenInclude(token, 'delete')}
								className="flex flex-nowrap items-center gap-1 rounded-md bg-[#e4efe2] px-2 py-1 whitespace-nowrap text-[#007c00] dark:bg-[#18221d] dark:text-[#00ab00]"
							>
								<span>{`Include: ${token}`}</span>
								<Icon name="x" height={14} width={14} />
							</button>
						))}

						{tokensToExclude.map((token) => (
							<button
								key={'excludedtokeninsearch' + token}
								onClick={() => handleTokenExclude(token, 'delete')}
								className="flex flex-nowrap items-center gap-1 rounded-md bg-[#fef2f2] px-2 py-1 whitespace-nowrap text-[#dc2626] dark:bg-[#1f1b1b] dark:text-[#ef4444]"
							>
								<span>{`Exclude: ${token}`}</span>
								<Icon name="x" height={14} width={14} />
							</button>
						))}

						{tokensThatMatchExactly.map((token) => (
							<button
								key={'exacttokensinsearch' + token}
								onClick={() => handleTokenExact(token, 'delete')}
								className="flex flex-nowrap items-center gap-1 rounded-md bg-(--link-bg) px-2 py-1 whitespace-nowrap text-(--link-text)"
							>
								<span>{`Exact: ${token}`}</span>
								<Icon name="x" height={14} width={14} />
							</button>
						))}

						{pairTokens.map((token) => (
							<button
								key={'pairtokensinsearch' + token}
								onClick={() => handlePairTokens(token, 'delete')}
								className="flex flex-nowrap items-center gap-1 rounded-md bg-[#fff7ed] px-2 py-1 whitespace-nowrap text-[#ea580c] dark:bg-[#1f1b1b] dark:text-[#fb923c]"
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
					<div className="flex flex-nowrap items-center overflow-x-auto rounded-md border-(--bg-input) bg-(--bg-input) p-1 text-xs font-medium">
						{['Tokens', 'Pairs'].map((dataType) => (
							<button
								onClick={() => {
									setTab(dataType as 'Tokens' | 'Pairs')
									setSearchValue('')
								}}
								className="shrink-0 rounded-md px-[10px] py-1 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
								data-active={tab === dataType}
								key={dataType}
							>
								{dataType}
							</button>
						))}
					</div>
					<Ariakit.DialogDismiss
						className="-my-2 ml-auto rounded-lg p-2 text-(--text-tertiary) hover:bg-(--divider) hover:text-(--text-primary)"
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
									className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
								/>
								<Ariakit.Combobox
									autoSelect
									autoFocus
									placeholder="Search for a token to filter by..."
									className="dark:placeholder:[#919296] min-h-8 w-full rounded-md border-(--bg-input) bg-(--bg-input) p-[6px] pl-7 text-base text-black outline-hidden placeholder:text-[#666] dark:text-white"
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
											className="flex cursor-pointer flex-wrap items-center gap-1 overflow-hidden rounded-md bg-(--cards-bg) p-2 px-4 py-2 text-sm hover:bg-(--link-button)"
										>
											{(token?.logo || token?.fallbackLogo) && (
												<TokenLogo logo={token?.logo} fallbackLogo={token?.fallbackLogo} />
											)}
											<span>{`${token.symbol}`}</span>
											<div className="mt-1 flex w-full flex-nowrap items-center gap-1 sm:mt-0 sm:ml-auto sm:w-min">
												<button
													onClick={(e) => {
														e.stopPropagation()
														handleTokenInclude(token.symbol)
													}}
													className="flex-1 rounded-md bg-[#e4efe2] text-[#007c00] sm:px-2 sm:py-1 dark:bg-[#18221d] dark:text-[#00ab00]"
												>
													Include
												</button>
												<button
													onClick={(e) => {
														e.stopPropagation()
														handleTokenExclude(token.symbol)
													}}
													className="flex-1 rounded-md bg-[#fef2f2] text-[#dc2626] sm:px-2 sm:py-1 dark:bg-[#1f1b1b] dark:text-[#ef4444]"
												>
													Exclude
												</button>

												<button
													onClick={(e) => {
														e.stopPropagation()
														handleTokenExact(token.symbol)
													}}
													className="flex-1 rounded-md bg-(--link-bg) text-(--link-text) sm:px-2 sm:py-1"
												>
													Exact
												</button>
											</div>
										</Ariakit.ComboboxItem>
									))}

									{matches.length > viewableMatches ? (
										<button
											onClick={() => setViewableMatches((prev) => prev + 20)}
											className="w-full rounded-md px-4 pt-4 pb-7 text-left text-(--link) hover:bg-(--bg-secondary) focus-visible:bg-(--bg-secondary)"
										>
											See more...
										</button>
									) : null}
								</div>
							) : (
								<p className="px-3 py-6 text-center text-(--text-primary)">No results found</p>
							)}
						</Ariakit.ComboboxProvider>
					</>
				) : (
					<>
						<div className="-mb-4 flex items-center gap-2">
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
									className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
								/>
								<Ariakit.Combobox
									autoSelect
									autoFocus
									placeholder="Search for a token to add to current pair..."
									className="dark:placeholder:[#919296] min-h-8 w-full rounded-md border-(--bg-input) bg-(--bg-input) p-[6px] pl-7 text-base text-black outline-hidden placeholder:text-[#666] dark:text-white"
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
											className="flex cursor-pointer flex-wrap items-center gap-1 overflow-hidden rounded-md bg-(--cards-bg) p-2 px-4 py-2 text-sm hover:bg-(--link-button)"
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
											className="w-full rounded-md px-4 pt-4 pb-7 text-left text-(--link) hover:bg-(--bg-secondary) focus-visible:bg-(--bg-secondary)"
										>
											See more...
										</button>
									) : null}

									<button
										className="disabled:text-opacity-50 sticky bottom-0 w-full rounded-md bg-(--old-blue) py-2 text-white disabled:cursor-not-allowed"
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
								<p className="px-3 py-6 text-center text-(--text-primary)">No results found</p>
							)}
						</Ariakit.ComboboxProvider>
					</>
				)}
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
