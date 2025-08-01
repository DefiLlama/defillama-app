import * as React from 'react'
import Layout from '~/layout'
import { Announcement } from '~/components/Announcement'
import { disclaimer, findOptimizerPools } from '~/containers/Yields/utils'
import { getAllCGTokensList, maxAgeForNext } from '~/api'
import { getLendBorrowData } from '~/containers/Yields/queries/index'
import { withPerformanceLogging } from '~/utils/perf'
import { useRouter } from 'next/router'
import { TokenLogo } from '~/components/TokenLogo'
import { chainIconUrl, tokenIconUrl } from '~/utils'
import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
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
		<Layout title={`Borrow Aggregator - DefiLlama`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<div className="flex flex-col gap-3 items-center w-full max-w-md mx-auto rounded-md relative lg:left-[-110px] lg:top-4 xl:top-11 bg-(--cards-bg) p-3">
				<div className="flex flex-col gap-5 p-3 overflow-y-auto w-full">
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
						<small className="text-center mt-[2px] text-orange-500">
							Select your collateral token to see real borrow cost!
						</small>
					) : null}

					{borrowToken || collateralToken ? (
						<label className="flex gap-1 mx-auto cursor-pointer">
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

	const matches = React.useMemo(() => {
		const data = Object.values(searchData)
		return matchSorter(data, searchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			keys: ['name', 'symbol'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [searchData, searchValue])

	const [viewableMatches, setViewableMatches] = React.useState(20)

	return (
		<div className="flex flex-col gap-1 w-full">
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
					<Ariakit.Select className="bg-(--btn-bg) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) flex items-center gap-2 p-3 text-base font-medium rounded-md cursor-pointer text-(--text1) flex-nowrap">
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
						className="flex flex-col bg-(--bg1) rounded-md max-sm:rounded-b-none z-10 overflow-auto overscroll-contain min-w-[180px] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer h-full max-h-[70vh] sm:max-h-[60vh]"
					>
						<Ariakit.Combobox
							placeholder="Search..."
							autoFocus
							className="bg-white dark:bg-black rounded-md text-base py-1 px-3 m-3"
						/>

						{matches.length > 0 ? (
							<>
								<Ariakit.ComboboxList>
									{matches.slice(0, viewableMatches + 1).map((option) => (
										<Ariakit.SelectItem
											key={`${queryParam}-${option.symbol}`}
											value={option.symbol}
											className="group flex items-center gap-4 py-2 px-3 shrink-0 hover:bg-(--primary1-hover) focus-visible:bg-(--primary1-hover) data-active-item:bg-(--primary1-hover) cursor-pointer last-of-type:rounded-b-md border-b border-(--form-control-border)"
											render={<Ariakit.ComboboxItem />}
										>
											{option.symbol === 'USD_STABLES' ? searchData[option.symbol].name : `${option.symbol}`}
										</Ariakit.SelectItem>
									))}
								</Ariakit.ComboboxList>
								{matches.length > viewableMatches ? (
									<button
										className="w-full py-4 px-3 text-(--link) hover:bg-(--bg2) focus-visible:bg-(--bg2)"
										onClick={() => setViewableMatches((prev) => prev + 20)}
									>
										See more...
									</button>
								) : null}
							</>
						) : (
							<p className="text-(--text1) py-6 px-3 text-center">No results found</p>
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
]

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
				(tab === 'safe' ? safeProjects.includes(pool.projectName) : !safeProjects.includes(pool.projectName)) &&
				pool.borrow.totalAvailableUsd
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
		<div className="rounded-md bg-white/60 dark:bg-black/60 flex flex-col overflow-y-auto w-full">
			<div className="flex flex-wrap overflow-x-auto border-b border-(--form-control-border)">
				<button
					className="py-2 px-6 whitespace-nowrap border-b rounded-tl-xl border-(--form-control-border) data-[selected=true]:border-b-(--primary1) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
					onClick={() => setTab('safe')}
					data-selected={tab === 'safe'}
				>
					Safe
				</button>
				<button
					className="py-2 px-6 whitespace-nowrap border-b border-l border-(--form-control-border) data-[selected=true]:border-b-(--primary1) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
					onClick={() => setTab('degen')}
					data-selected={tab === 'degen'}
				>
					Degen
				</button>
			</div>

			{finalPools.length === 0 ? (
				<p className="m-4 mb-6 text-center">Couldn't find any pools</p>
			) : (
				<table className="border-separate border-spacing-y-2 my-4">
					<tbody>
						{finalPools.map((pool) => (
							<tr key={JSON.stringify(pool)} className="p-3">
								<th className="rounded-l-md bg-[#eff0f3] dark:bg-[#17181c] p-2 text-sm font-normal">
									<span className="flex items-center flex-nowrap gap-1">
										<TokenLogo logo={tokenIconUrl(pool.projectName)} size={20} />
										<span className="whitespace-nowrap">{pool.projectName}</span>
									</span>
								</th>

								<td className="bg-[#eff0f3] dark:bg-[#17181c] p-2 text-sm font-normal">
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
								<td className="rounded-r-md bg-[#eff0f3] dark:bg-[#17181c] p-2 text-sm font-normal">
									<span className="flex items-center  gap-1.5">
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
