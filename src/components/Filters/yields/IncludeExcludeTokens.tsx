import { useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { Combobox, ComboboxPopover, useComboboxState } from 'ariakit/combobox'
import { TokenLogo } from '~/components/TokenLogo'
import { findActiveItem } from '~/components/Search/Base/utils'
import { Icon } from '~/components/Icon'

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
		<div
			ref={searchWrapperRef}
			{...props}
			className="relative hidden sm:flex flex-col gap-2 rounded-md py-2 data-[alwaysdisplay=true]:flex bg-[var(--btn-bg)]"
		>
			{(tokensToInclude.length > 0 || tokensToExclude.length > 0) && (
				<div className="flex items-center flex-wrap gap-4 px-2">
					{tokensToInclude.map((token) => (
						<button
							key={'includedtokeninsearch' + token}
							onClick={() => handleTokenInclude(token, 'delete')}
							className="flex items-center gap-1 flex-nowrap py-1 px-2 whitespace-nowrap rounded-md bg-[#dcdcdc] dark:bg-[#40444F]"
						>
							<span>{`Include: ${token}`}</span>
							<Icon name="x" height={14} width={14} />
						</button>
					))}

					{tokensToExclude.map((token) => (
						<button
							key={'excludedtokeninsearch' + token}
							onClick={() => handleTokenExclude(token, 'delete')}
							className="flex items-center gap-1 flex-nowrap py-1 px-2 whitespace-nowrap rounded-md bg-[#dcdcdc] dark:bg-[#40444F]"
						>
							<span>{`Exclude: ${token}`}</span>
							<Icon name="x" height={14} width={14} />
						</button>
					))}

					{tokensThatMatchExactly.map((token) => (
						<button
							key={'exacttokensinsearch' + token}
							onClick={() => handleTokenExact(token, 'delete')}
							className="flex items-center gap-1 flex-nowrap py-1 px-2 whitespace-nowrap rounded-md bg-[#dcdcdc] dark:bg-[#40444F]"
						>
							<span>{`Exact: ${token}`}</span>
							<Icon name="x" height={14} width={14} />
						</button>
					))}
				</div>
			)}

			<div className="relative">
				<Combobox
					state={combobox}
					placeholder="Search for a token to filter by"
					autoSelect
					autoFocus
					className="px-8 outline-none w-full rounded-t-md text-sm bg-[var(--btn-bg)] text-black dark:text-white"
				/>
				<Icon name="search" height={16} width={16} className="absolute left-2 bottom-[2px]" />
			</div>

			<ComboboxPopover
				state={combobox}
				className="h-full max-h-[320px] overflow-y-auto bg-[var(--bg6)] rounded-b-md shadow z-10 top-3 left-0 right-0"
			>
				{!combobox.mounted ? (
					<p className="text-[var(--text1)] py-6 px-3 text-center">Loading...</p>
				) : combobox.matches.length ? (
					<>
						{options.slice(0, resultsLength + 1).map((token) => (
							<div
								key={token.name}
								onClick={() => handleTokenInclude(token.symbol)}
								className="flex items-center flex-wrap gap-1 p-2 text-sm text-[var(--text1)] overflow-hidden hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)] sm:py-3 sm:px-4"
							>
								{(token?.logo || token?.fallbackLogo) && (
									<TokenLogo logo={token?.logo} fallbackLogo={token?.fallbackLogo} />
								)}
								<span>{`${token.name} (${token.symbol})`}</span>
								<div className="w-full sm:w-min flex items-center flex-nowrap gap-1 mt-1 sm:mt-0 sm:ml-auto">
									<button
										onClick={(e) => {
											e.stopPropagation()

											handleTokenInclude(token.symbol)
										}}
										className="flex-1 rounded-md sm:py-1 sm:px-2 bg-[#dcdcdc] dark:bg-[#40444F]"
									>
										Include
									</button>
									<button
										onClick={(e) => {
											e.stopPropagation()

											handleTokenExclude(token.symbol)
										}}
										className="flex-1 rounded-md sm:py-1 sm:px-2 bg-[#dcdcdc] dark:bg-[#40444F]"
									>
										Exclude
									</button>

									<button
										onClick={(e) => {
											e.stopPropagation()

											handleTokenExact(token.symbol)
										}}
										className="flex-1 rounded-md sm:py-1 sm:px-2 bg-[#dcdcdc] dark:bg-[#40444F]"
									>
										Exact
									</button>
								</div>
							</div>
						))}

						{resultsLength < combobox.matches.length && (
							<button
								onClick={showMoreResults}
								className="text-left w-full pt-4 px-4 pb-7 text-[var(--link)] hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)]"
							>
								See more...
							</button>
						)}
					</>
				) : (
					<p className="text-[var(--text1)] py-6 px-3 text-center">No results found</p>
				)}
			</ComboboxPopover>
		</div>
	)
}
