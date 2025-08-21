import * as React from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { getAllCGTokensList, maxAgeForNext } from '~/api'
import { Announcement } from '~/components/Announcement'
import { TokenLogo } from '~/components/TokenLogo'
import { getLendBorrowData } from '~/containers/Yields/queries/index'
import { disclaimer, findOptimizerPools } from '~/containers/Yields/utils'
import Layout from '~/layout'
import { chainIconUrl, tokenIconUrl } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'
import { getQueryValue } from '~/utils/url'

export const getStaticProps = withPerformanceLogging('borrow', async () => {
	const {
		props: { pools, ...data }
	} = await getLendBorrowData()

	let cgList = await getAllCGTokensList()
	const cgTokens = cgList.filter((x) => x.symbol)
	const cgPositions = cgList.reduce((acc, e, i) => ({ ...acc, [e.symbol]: i }), {} as any)
	const searchData = {
		['USD_STABLES']: {
			name: `All USD Stablecoins`,
			symbol: 'USD_STABLES'
		}
	}

	data.symbols
		.sort((a, b) => cgPositions[a] - cgPositions[b])
		.forEach((sRaw) => {
			const s = sRaw.replaceAll(/\(.*\)/g, '').trim()

			const cgToken = cgTokens.find((x) => x.symbol === sRaw.toLowerCase() || x.symbol === s.toLowerCase())

			searchData[s] = {
				name: s,
				symbol: s
			}
		})

	return {
		props: {
			// lend & borrow from query are uppercase only. symbols in pools are mixed case though -> without
			// setting to uppercase, we only show subset of available pools when applying `findOptimzerPools`
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

	const filteredPools = findOptimizerPools({
		pools: data.pools,
		tokenToLend: collateralToken,
		tokenToBorrow: borrowToken,
		cdpRoutes: data.cdpPools
	})

	return (
		<Layout title={`Borrow Aggregator - DefiLlama`} pageName={pageName}>
			<Announcement>{disclaimer}</Announcement>
			<div className="relative mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-md bg-(--cards-bg) p-3 xl:absolute xl:top-0 xl:right-0 xl:left-0 xl:m-auto xl:mt-[180px]">
				<div className="flex w-full flex-col gap-5 overflow-y-auto p-3">
					<TokensSelect
						label="Borrow"
						searchData={data.searchData}
						queryParam={'borrow'}
						placeholder="Select token to borrow"
					/>

					<TokensSelect
						label="Collateral"
						searchData={data.searchData}
						queryParam={'collateral'}
						placeholder="Select token for collateral"
					/>
					{borrowToken && !collateralToken ? (
						<small className="mt-[2px] text-center text-orange-500">
							Select your collateral token to see real borrow cost!
						</small>
					) : null}

					{borrowToken || collateralToken ? (
						<label className="mx-auto flex cursor-pointer gap-1">
							<input
								type="checkbox"
								checked={includeIncentives}
								onChange={() =>
									router.push(
										{ pathname: router.pathname, query: { ...router.query, incentives: !includeIncentives } },
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span className="text-base">Include Incentives</span>
						</label>
					) : null}
				</div>
				{(borrowToken || collateralToken) && <PoolsList pools={filteredPools} />}
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
		router.push({ pathname: '/borrow', query: { ...router.query, [queryParam]: value } }, undefined, { shallow: true })
	}

	const selectedValue: string = getQueryValue(router.query, queryParam) ?? ''

	const tokenInSearchData = selectedValue !== '' ? searchData[selectedValue.toUpperCase()] : null

	const [searchValue, setSearchValue] = React.useState('')
	const deferredSearchValue = React.useDeferredValue(searchValue)
	const matches = React.useMemo(() => {
		const data = Object.values(searchData)
		return matchSorter(data, deferredSearchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			keys: ['name', 'symbol'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [searchData, deferredSearchValue])

	const [viewableMatches, setViewableMatches] = React.useState(20)

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
					<Ariakit.SelectLabel className="text-base">{label}</Ariakit.SelectLabel>
					<Ariakit.Select className="flex cursor-pointer flex-nowrap items-center gap-2 rounded-md bg-(--btn-bg) p-3 text-base font-medium text-(--text-primary) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg)">
						{tokenInSearchData ? (
							<>
								<span>
									{tokenInSearchData.symbol === 'USD_STABLES' ? tokenInSearchData.name : tokenInSearchData.symbol}
								</span>
							</>
						) : (
							<span className="opacity-60">{placeholder}</span>
						)}
						<Ariakit.SelectArrow className="ml-auto" />
					</Ariakit.Select>
					<Ariakit.SelectPopover
						unmountOnHide
						hideOnInteractOutside
						sameWidth
						gutter={6}
						wrapperProps={{
							className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
						}}
						className="max-sm:drawer z-10 flex h-full max-h-[70vh] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:rounded-b-none sm:max-h-[60vh] dark:border-[hsl(204,3%,32%)]"
					>
						<Ariakit.Combobox
							placeholder="Search..."
							autoFocus
							className="m-3 rounded-md bg-white px-3 py-1 text-base dark:bg-black"
						/>

						{matches.length > 0 ? (
							<>
								<Ariakit.ComboboxList>
									{matches.slice(0, viewableMatches + 1).map((option) => (
										<Ariakit.SelectItem
											key={`${queryParam}-${option.symbol}`}
											value={option.symbol}
											className="group flex shrink-0 cursor-pointer items-center gap-4 border-b border-(--form-control-border) px-3 py-2 last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
											render={<Ariakit.ComboboxItem />}
										>
											{option.symbol === 'USD_STABLES' ? searchData[option.symbol].name : `${option.symbol}`}
										</Ariakit.SelectItem>
									))}
								</Ariakit.ComboboxList>
								{matches.length > viewableMatches ? (
									<button
										className="w-full px-3 py-4 text-(--link) hover:bg-(--bg-secondary) focus-visible:bg-(--bg-secondary)"
										onClick={() => setViewableMatches((prev) => prev + 20)}
									>
										See more...
									</button>
								) : null}
							</>
						) : (
							<p className="px-3 py-6 text-center text-(--text-primary)">No results found</p>
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

	filteredPools.forEach((pool) => {
		if (!filteredPools2[pool.projectName + pool.chain]) {
			filteredPools2[pool.projectName + pool.chain] = pool
		}
	})

	const finalPools: Array<IPool> = Object.values(filteredPools2)

	return (
		<div className="flex w-full flex-col overflow-y-auto rounded-md bg-white/60 dark:bg-black/60">
			<div className="flex flex-wrap overflow-x-auto border-b border-(--form-control-border)">
				<button
					className="rounded-tl-xl border-b border-(--form-control-border) px-6 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[selected=true]:border-b-(--primary)"
					onClick={() => setTab('safe')}
					data-selected={tab === 'safe'}
				>
					Safe
				</button>
				<button
					className="border-b border-l border-(--form-control-border) px-6 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[selected=true]:border-b-(--primary)"
					onClick={() => setTab('degen')}
					data-selected={tab === 'degen'}
				>
					Degen
				</button>
			</div>

			{finalPools.length === 0 ? (
				<p className="m-4 mb-6 text-center">Couldn't find any pools</p>
			) : (
				<table className="my-4 border-separate border-spacing-y-2">
					<tbody>
						{finalPools.map((pool) => (
							<tr key={JSON.stringify(pool)} className="p-3">
								<th className="rounded-l-md bg-[#eff0f3] p-2 text-sm font-normal dark:bg-[#17181c]">
									<span className="flex flex-nowrap items-center gap-1">
										<TokenLogo logo={tokenIconUrl(pool.projectName)} size={20} />
										<span className="whitespace-nowrap">{pool.projectName}</span>
									</span>
								</th>

								<td className="bg-[#eff0f3] p-2 text-sm font-normal dark:bg-[#17181c]">
									<span className="flex flex-col">
										<span>
											{getAPY(pool, borrow, collateral, incentives).toLocaleString(undefined, {
												maximumFractionDigits: 2
											})}
											%
										</span>
										<span className="text-xs whitespace-nowrap opacity-70">
											{borrow && collateral ? 'Net APY' : borrow ? 'Net Borrow APY' : 'Net Supply APY'}
										</span>
									</span>
								</td>
								<td className="rounded-r-md bg-[#eff0f3] p-2 text-sm font-normal dark:bg-[#17181c]">
									<span className="flex items-center gap-1.5">
										<TokenLogo logo={chainIconUrl(pool.chain)} size={20} />
										<span>{pool.chain}</span>
									</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	)
}
