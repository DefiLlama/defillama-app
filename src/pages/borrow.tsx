import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { useRouter } from 'next/router'
import * as React from 'react'
import { fetchCoinGeckoTokensListFromDataset } from '~/api/coingecko'
import { Announcement } from '~/components/Announcement'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'
import { getLendBorrowData } from '~/containers/Yields/queries/index'
import { disclaimer, exploitWarning, findOptimizerPools } from '~/containers/Yields/utils'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'
import { getQueryValue, pushShallowQuery } from '~/utils/routerQuery'

export const getStaticProps = withPerformanceLogging('borrow', async () => {
	const {
		props: { pools, ...data }
	} = await getLendBorrowData()

	let cgList = await fetchCoinGeckoTokensListFromDataset()
	// const cgTokens = cgList.filter((x) => x.symbol)
	const cgPositions = cgList.reduce((acc, e, i) => ({ ...acc, [e.symbol]: i }), {} as any)
	const searchData = {
		['USD_STABLES']: {
			name: `All USD Stablecoins`,
			symbol: 'USD_STABLES'
		}
	}

	const sortedSymbols = data.symbols.sort((a, b) => cgPositions[a] - cgPositions[b])
	for (const sRaw of sortedSymbols) {
		const s = sRaw.replaceAll(/\(.*\)/g, '').trim()

		// const cgToken = cgTokens.find((x) => x.symbol === sRaw.toLowerCase() || x.symbol === s.toLowerCase())

		searchData[s] = {
			name: s,
			symbol: s
		}
	}

	return {
		props: {
			// lend & borrow from query are uppercase only. symbols in pools are mixed case though -> without
			// setting to uppercase, we only show subset of available pools when applying `findOptimizerPools`
			pools: pools
				.filter((p) => p.category !== 'CDP' && !p.mintedCoin)
				.map((p) => ({ ...p, symbol: p.symbol.toUpperCase() })),
			cdpPools: pools
				.filter((p) => (p.category === 'CDP' && p.mintedCoin) || (p.category === 'Lending' && p.mintedCoin)) // for lending projects with isolated markets (like morpho-blue) we use the mintedCoin integration
				.map((p) => ({ ...p, chains: [p.chain], borrow: { ...p, symbol: p.mintedCoin.toUpperCase() } })),
			searchData
		},
		revalidate: maxAgeForNext([23])
	}
})

const pageName = ['Borrow Aggregator: Simple']

export default function YieldBorrow(data) {
	const router = useRouter()

	const includeIncentives = router.query['incentives'] === 'true'

	const borrowToken = getQueryValue(router.query, 'borrow')

	const collateralToken = getQueryValue(router.query, 'collateral')

	const handleSwap = () => {
		const newBorrow = collateralToken ?? ''
		const newCollateral = borrowToken ?? ''

		void pushShallowQuery(router, {
			borrow: newBorrow || undefined,
			collateral: newCollateral || undefined
		})
	}

	const filteredPools = findOptimizerPools({
		pools: data.pools,
		tokenToLend: collateralToken,
		tokenToBorrow: borrowToken,
		cdpRoutes: data.cdpPools
	})

	const hasSelection = borrowToken || collateralToken

	return (
		<Layout
			title="Borrow Rate Aggregator - Best DeFi Lending Rates - DefiLlama"
			description="Find optimal DeFi lending and borrowing routes. Compare borrow rates across Aave, Compound, Morpho, and 50+ lending protocols. Calculate net APY with collateral on Ethereum, Solana, and all major chains."
			canonicalUrl={`/borrow`}
			pageName={pageName}
		>
			<Announcement announcementId="yields-disclaimer" version="2026-03">
				{disclaimer}
			</Announcement>
			<Announcement announcementId="resolv-exploit" version="2026-03" warning>
				{exploitWarning}
			</Announcement>
			<div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-start">
				<div className="w-full shrink-0 rounded-md border border-(--cards-border) bg-(--cards-bg) lg:w-[340px]">
					<div className="relative flex flex-col p-4">
						<TokensSelect
							label="Borrow"
							searchData={data.searchData}
							queryParam={'borrow'}
							placeholder="Select token to borrow"
						/>

						<div className="relative z-10 flex items-center justify-center pt-2">
							<button
								aria-label="Swap borrow and collateral"
								onClick={handleSwap}
								className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-(--form-control-border) bg-(--cards-bg) text-(--text-tertiary) transition-all hover:scale-105 hover:border-(--primary) hover:text-(--primary) focus-visible:border-(--primary) focus-visible:text-(--primary) active:scale-95"
								title="Swap borrow and collateral"
							>
								<Icon name="repeat" className="h-4 w-4" />
							</button>
						</div>

						<TokensSelect
							label="Collateral"
							searchData={data.searchData}
							queryParam={'collateral'}
							placeholder="Select token for collateral"
						/>
					</div>

					{borrowToken && !collateralToken ? (
						<p className="border-t border-(--cards-border) px-4 py-2.5 text-center text-sm text-(--warning)">
							Select collateral to see real borrow cost
						</p>
					) : null}

					{hasSelection ? (
						<label className="group flex cursor-pointer items-center justify-between border-t border-(--cards-border) px-4 py-3 transition-colors hover:bg-(--btn-bg)">
							<span className="text-sm text-(--text-secondary) select-none">Include Incentives</span>
							<span
								data-checked={includeIncentives}
								className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-(--form-control-border) bg-(--btn-bg) transition-colors data-[checked=true]:border-(--primary) data-[checked=true]:bg-(--primary)"
							>
								<span
									className="pointer-events-none block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-(--text-tertiary) shadow-sm transition-transform data-[checked=true]:translate-x-[17px] data-[checked=true]:bg-white"
									data-checked={includeIncentives}
								/>
							</span>
							<input
								type="checkbox"
								checked={includeIncentives}
								onChange={() => {
									void pushShallowQuery(router, { incentives: includeIncentives ? undefined : 'true' })
								}}
								className="sr-only"
							/>
						</label>
					) : null}
				</div>

				<div className="min-w-0 flex-1">
					{hasSelection ? (
						<PoolsList pools={filteredPools} />
					) : (
						<div className="flex flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) px-6 py-16 text-center">
							<p className="text-base text-(--text-secondary)">
								Select a token to borrow and collateral to compare rates across protocols
							</p>
						</div>
					)}
				</div>
			</div>
		</Layout>
	)
}

const TokensSelect = ({
	searchData,
	label,
	queryParam,
	placeholder
}: {
	searchData: { [token: string]: { name: string; symbol: string; image: string; image2: string } }
	label: string
	queryParam: string
	placeholder: string
}) => {
	const router = useRouter()

	const onChange = (value) => {
		void pushShallowQuery(router, { [queryParam]: value || undefined }, '/borrow')
	}

	const selectedValue: string = getQueryValue(router.query, queryParam) ?? ''

	const tokenInSearchData = selectedValue !== '' ? searchData[selectedValue.toUpperCase()] : null

	const searchDataArray = Object.values(searchData)

	const [searchValue, setSearchValue] = React.useState('')
	const deferredSearchValue = React.useDeferredValue(searchValue)
	const matches = React.useMemo(() => {
		if (!deferredSearchValue) return searchDataArray
		return matchSorter(searchDataArray, deferredSearchValue, {
			keys: ['name', 'symbol'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [searchDataArray, deferredSearchValue])

	const [viewableMatches, setViewableMatches] = React.useState(20)

	const comboboxRef = React.useRef<HTMLDivElement>(null)

	const handleSeeMore = (e: React.MouseEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		const previousCount = viewableMatches
		setViewableMatches((prev) => prev + 20)

		// Focus on the first newly loaded item after a brief delay
		setTimeout(() => {
			const items = comboboxRef.current?.querySelectorAll('[role="option"]')
			if (items && items.length > previousCount) {
				const firstNewItem = items[previousCount] as HTMLElement
				firstNewItem?.focus()
			}
		}, 0)
	}

	return (
		<div className="flex w-full flex-col gap-1">
			<Ariakit.ComboboxProvider
				resetValueOnHide
				setValue={(value) => {
					React.startTransition(() => {
						setSearchValue(value)
					})
				}}
			>
				<Ariakit.SelectProvider value={selectedValue} setValue={onChange}>
					<Ariakit.SelectLabel className="text-[11px] font-semibold tracking-widest text-(--text-tertiary) uppercase">
						{label}
					</Ariakit.SelectLabel>
					<Ariakit.Select
						className={`group flex cursor-pointer flex-nowrap items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-all ${
							tokenInSearchData
								? 'border border-(--primary)/30 bg-(--primary)/5 font-semibold text-(--text-primary) hover:border-(--primary)/50 hover:bg-(--primary)/10'
								: 'border border-(--form-control-border) bg-(--btn-bg) text-(--text-tertiary) hover:border-(--bg-border) hover:bg-(--btn-hover-bg)'
						} focus-visible:border-(--primary) focus-visible:ring-1 focus-visible:ring-(--primary)/30`}
					>
						{tokenInSearchData ? (
							<span className="truncate">
								{tokenInSearchData.symbol === 'USD_STABLES' ? tokenInSearchData.name : tokenInSearchData.symbol}
							</span>
						) : (
							<span>{placeholder}</span>
						)}
						<Icon
							name="chevron-down"
							className="ml-auto h-4 w-4 shrink-0 opacity-40 transition-transform group-aria-expanded:rotate-180"
						/>
					</Ariakit.Select>
					<Ariakit.SelectPopover
						unmountOnHide
						hideOnInteractOutside
						sameWidth
						gutter={4}
						wrapperProps={{
							className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
						}}
						className="z-10 flex min-w-[180px] flex-col overflow-auto overscroll-contain rounded-lg border border-(--cards-border) bg-(--bg-main) shadow-lg max-sm:h-[calc(100dvh-80px)] max-sm:drawer max-sm:rounded-b-none sm:max-h-[min(400px,60dvh)] lg:max-h-(--popover-available-height)"
					>
						<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
							<Icon name="x" className="h-5 w-5" />
						</Ariakit.PopoverDismiss>

						<div className="p-2">
							<Ariakit.Combobox
								placeholder="Search tokens..."
								className="w-full rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-2 text-sm transition-colors outline-none placeholder:text-(--text-tertiary) focus:border-(--primary)"
							/>
						</div>

						{matches.length > 0 ? (
							<Ariakit.ComboboxList ref={comboboxRef} className="px-1 pb-1">
								{matches.slice(0, viewableMatches).map((option) => (
									<Ariakit.SelectItem
										key={`${queryParam}-${option.symbol}`}
										value={option.symbol}
										className="group flex shrink-0 cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm cv-auto-37 hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
										render={<Ariakit.ComboboxItem />}
									>
										<span className="truncate">
											{option.symbol === 'USD_STABLES' ? searchData[option.symbol].name : option.symbol}
										</span>
										{option.symbol === selectedValue ? (
											<Icon name="check" className="ml-auto h-3.5 w-3.5 shrink-0 text-(--primary)" />
										) : null}
									</Ariakit.SelectItem>
								))}
								{matches.length > viewableMatches ? (
									<Ariakit.ComboboxItem
										value="__see_more__"
										setValueOnClick={false}
										hideOnClick={false}
										className="w-full cursor-pointer rounded-md px-2.5 py-2 text-sm text-(--link) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-active-item:bg-(--link-hover-bg)"
										onClick={handleSeeMore}
									>
										See more...
									</Ariakit.ComboboxItem>
								) : null}
							</Ariakit.ComboboxList>
						) : (
							<p className="px-3 py-6 text-center text-sm text-(--text-tertiary)">No results found</p>
						)}
					</Ariakit.SelectPopover>
				</Ariakit.SelectProvider>
			</Ariakit.ComboboxProvider>
		</div>
	)
}

const safeProjects = [
	'AAVE',
	'AAVE V2',
	'AAVE V3',
	'AAVE V1',
	'MakerDAO',
	'Sky',
	'Spark',
	'Compound',
	'Compound V1',
	'Compound V2',
	'Compound V3'
].map((x) => x.toLowerCase())

interface IPool {
	projectName: string
	totalAvailableUsd: number
	chain: string
	pool: string | null
	poolMeta: string | null
	tvlUsd: number
	borrow: any
	apyBaseBorrow?: number | null
	apyBase?: number | null
	apy?: number | null
	apyReward?: number | null
	apyRewardBorrow?: number | null
	ltv?: number | null
}

const getAPY = (
	pool: IPool,
	borrow: string | string[],
	collateral: string | string[],
	incentives: string | string[]
): number => {
	const withIncentives = incentives === 'true'

	const supplyApy = withIncentives ? pool.apy : pool.apyBase
	const borrowApy = withIncentives ? pool.borrow.apyBorrow : pool.borrow.apyBaseBorrow

	if (borrow && collateral) {
		return supplyApy + borrowApy * pool.ltv
	}

	// borrow only
	if (borrow) {
		return borrowApy ?? 0
	}

	// supply only
	return supplyApy ?? 0
}

const PoolsList = ({ pools }: { pools: Array<IPool> }) => {
	const [tab, setTab] = React.useState('safe')

	const filteredPools = pools
		.filter(
			(pool) =>
				(tab === 'safe'
					? safeProjects.includes(pool.projectName.toLowerCase())
					: !safeProjects.includes(pool.projectName.toLowerCase())) && pool.borrow.totalAvailableUsd
		)
		.sort((a, b) => b.tvlUsd - a.tvlUsd)

	const router = useRouter()
	const { borrow, collateral, incentives } = router.query

	const filteredPools2 = {}

	for (const pool of filteredPools) {
		if (!filteredPools2[pool.projectName + pool.chain]) {
			filteredPools2[pool.projectName + pool.chain] = pool
		}
	}

	const finalPools: Array<IPool> = Object.values(filteredPools2)

	const apyLabel = borrow && collateral ? 'Net APY' : borrow ? 'Net Borrow APY' : 'Net Supply APY'
	const showAvailable = Boolean(borrow)

	return (
		<div className="flex w-full flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex items-center border-b border-(--cards-border)">
				<button
					className="px-4 py-2.5 text-sm font-medium transition-colors data-[selected=false]:text-(--text-tertiary) data-[selected=true]:text-(--text-primary) data-[selected=true]:shadow-[inset_0_-2px_0_var(--primary)]"
					onClick={() => setTab('safe')}
					data-selected={tab === 'safe'}
				>
					Safe
				</button>
				<button
					className="px-4 py-2.5 text-sm font-medium transition-colors data-[selected=false]:text-(--text-tertiary) data-[selected=true]:text-(--text-primary) data-[selected=true]:shadow-[inset_0_-2px_0_var(--primary)]"
					onClick={() => setTab('degen')}
					data-selected={tab === 'degen'}
				>
					Degen
				</button>
				<span className="ml-auto pr-4 text-xs text-(--text-tertiary)">
					{finalPools.length} {finalPools.length === 1 ? 'result' : 'results'}
				</span>
			</div>

			{finalPools.length === 0 ? (
				<p className="px-4 py-12 text-center text-sm text-(--text-tertiary)">No pools found for this pair</p>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b border-(--cards-border) text-left text-xs text-(--text-tertiary)">
								<th className="px-4 py-2.5 font-medium">Protocol</th>
								<th className="px-4 py-2.5 font-medium">{apyLabel}</th>
								<th className="px-4 py-2.5 font-medium">Chain</th>
								{showAvailable ? <th className="px-4 py-2.5 text-right font-medium">Available</th> : null}
							</tr>
						</thead>
						<tbody>
							{finalPools.map((pool) => {
								const apy = getAPY(pool, borrow, collateral, incentives)
								return (
									<tr
										key={pool.projectName + pool.chain}
										className="border-b border-(--cards-border) transition-colors last:border-b-0 hover:bg-(--btn-bg)"
									>
										<td className="px-4 py-3">
											<span className="flex items-center gap-2">
												<TokenLogo name={pool.projectName} kind="token" size={20} alt={`Logo of ${pool.projectName}`} />
												<span className="text-sm font-medium">{pool.projectName}</span>
											</span>
										</td>
										<td className="px-4 py-3">
											<span
												className={`text-sm font-medium tabular-nums ${apy >= 0 ? 'text-(--success)' : 'text-(--error)'}`}
											>
												{apy.toLocaleString(undefined, { maximumFractionDigits: 2 })}%
											</span>
										</td>
										<td className="px-4 py-3">
											<span className="flex items-center gap-2">
												<TokenLogo name={pool.chain} kind="chain" size={18} alt={`Logo of ${pool.chain}`} />
												<span className="text-sm text-(--text-secondary)">{pool.chain}</span>
											</span>
										</td>
										{showAvailable ? (
											<td className="px-4 py-3 text-right">
												<span className="text-sm text-(--text-secondary) tabular-nums">
													{pool.borrow.totalAvailableUsd
														? `$${(pool.borrow.totalAvailableUsd / 1e6).toLocaleString(undefined, {
																maximumFractionDigits: 1
															})}M`
														: '—'}
												</span>
											</td>
										) : null}
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	)
}
