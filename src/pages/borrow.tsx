import * as React from 'react'
import Layout from '~/layout'
import { Announcement } from '~/components/Announcement'
import { disclaimer, findOptimizerPools } from '~/containers/YieldsPage/utils'
import { getAllCGTokensList, maxAgeForNext } from '~/api'
import { getLendBorrowData } from '~/api/categories/yield'
import { withPerformanceLogging } from '~/utils/perf'
import { useSelectState, SelectArrow, Select, SelectPopover, SelectItem } from 'ariakit/select'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { Combobox, ComboboxList, useComboboxState } from 'ariakit/combobox'
import { useRouter } from 'next/router'
import { TokenLogo } from '~/components/TokenLogo'
import { chainIconUrl, tokenIconUrl } from '~/utils'

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

	const borrowToken = router.query['borrow']
		? typeof router.query['borrow'] === 'string'
			? (router.query['borrow'] as string)
			: router.query['borrow'][0]
		: null

	const collateralToken = router.query['collateral']
		? typeof router.query['collateral'] === 'string'
			? (router.query['collateral'] as string)
			: router.query['collateral'][0]
		: null

	const filteredPools = findOptimizerPools({
		pools: data.pools,
		tokenToLend: collateralToken,
		tokenToBorrow: borrowToken,
		cdpRoutes: data.cdpPools
	})

	return (
		<Layout title={`Borrow Aggregator - DefiLlama`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<div className="flex flex-col mx-auto w-full max-w-md gap-4">
				<div className="rounded-md bg-white/60 dark:bg-black/60 flex flex-col gap-5 p-4 overflow-y-auto">
					<label className="flex flex-col gap-1 w-full">
						<span className="text-base">Borrow</span>
						<TokensSelect searchData={data.searchData} query={'borrow'} placeholder="Select token to borrow" />
					</label>

					<label className="flex flex-col gap-1 w-full">
						<span className="text-base">Collateral</span>
						<TokensSelect searchData={data.searchData} query={'collateral'} placeholder="Select token for collateral" />
						{borrowToken && !collateralToken ? (
							<small className="text-center mt-[2px] text-orange-500">
								Select your collateral token to see real borrow cost!
							</small>
						) : null}
					</label>

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
	query,
	placeholder
}: {
	searchData: { [token: string]: { name: string; symbol: string; image: string; image2: string } }
	query: string
	placeholder: string
}) => {
	const [isLarge, renderCallback] = useSetPopoverStyles()

	const combobox = useComboboxState({ list: Object.keys(searchData) })
	const { value, setValue, ...selectProps } = combobox
	const router = useRouter()

	const onChange = (value) => {
		router.push({ pathname: '/borrow', query: { ...router.query, [query]: value } }, undefined, { shallow: true })
	}

	const selectedValue: string = router.query[query]
		? typeof router.query[query] === 'string'
			? (router.query[query] as string)
			: router.query[query][0]
		: ''

	const select = useSelectState({
		...selectProps,
		defaultValue: '',
		value: selectedValue,
		setValue: onChange,
		gutter: 6,
		animated: isLarge ? false : true,
		sameWidth: true,
		renderCallback
	})

	// Resets combobox value when popover is collapsed
	if (!select.mounted && combobox.value) {
		combobox.setValue('')
	}

	const focusItemRef = React.useRef(null)

	const tokenInSearchData = selectedValue !== '' ? searchData[selectedValue.toUpperCase()] : null

	const [resultsLength, setResultsLength] = React.useState(10)

	const showMoreResults = () => {
		setResultsLength((prev) => prev + 10)
	}

	return (
		<>
			<Select
				state={select}
				className="bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-2 p-3 text-base font-medium rounded-md cursor-pointer text-[var(--text1)] flex-nowrap"
			>
				{tokenInSearchData ? (
					<>
						<TokenLogo logo={tokenInSearchData.image2} fallbackLogo={tokenInSearchData.image} />
						<span>
							{tokenInSearchData.symbol === 'USD_STABLES' ? tokenInSearchData.name : tokenInSearchData.symbol}
						</span>
					</>
				) : (
					<span className="opacity-60">{placeholder}</span>
				)}
				<SelectArrow className="ml-auto" />
			</Select>

			{select.mounted ? (
				<SelectPopover
					state={select}
					composite={false}
					initialFocusRef={focusItemRef}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer"
				>
					<Combobox
						state={combobox}
						placeholder="Search..."
						autoFocus
						className="bg-white dark:bg-black rounded-md py-2 px-3 m-3 mb-0"
					/>

					{combobox.matches.length > 0 ? (
						<ComboboxList state={combobox} className="flex flex-col overflow-auto overscroll-contain">
							{combobox.matches.slice(0, resultsLength + 1).map((value, i) => (
								<SelectItem
									value={value}
									key={value + i}
									focusOnHover
									className="flex items-center justify-between gap-4 p-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] cursor-pointer first-of-type:rounded-t-md last-of-type:rounded-b-md"
								>
									{value === 'USD_STABLES' ? searchData[value].name : `${value}`}
								</SelectItem>
							))}
						</ComboboxList>
					) : (
						<p className="text-[var(--text1)] py-6 px-3 text-center">No results found</p>
					)}

					{resultsLength < combobox.matches.length ? (
						<button
							className="text-left w-full pt-4 px-4 pb-7 text-[var(--link)] hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)]"
							onClick={showMoreResults}
						>
							See more...
						</button>
					) : null}
				</SelectPopover>
			) : null}
		</>
	)
}

const safeProjects = [
	'AAVE',
	'AAVE V2',
	'AAVE V3',
	'AAVE V1',
	'MakerDAO',
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
		<div className="rounded-md bg-white/60 dark:bg-black/60 flex flex-col overflow-y-auto">
			<div className="flex flex-wrap overflow-x-auto border-b border-black/10 dark:border-white/10">
				<button
					className="py-2 px-6 whitespace-nowrap border-b rounded-tl-xl border-black/10 dark:border-white/10 data-[selected=true]:border-b-[var(--primary1)] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)]"
					onClick={() => setTab('safe')}
					data-selected={tab === 'safe'}
				>
					Safe
				</button>
				<button
					className="py-2 px-6 whitespace-nowrap border-b border-l border-black/10 dark:border-white/10 data-[selected=true]:border-b-[var(--primary1)] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)]"
					onClick={() => setTab('degen')}
					data-selected={tab === 'degen'}
				>
					Degen
				</button>
			</div>

			{finalPools.length === 0 ? (
				<p className="m-4 mb-6 text-center">Couldn't find any pools</p>
			) : (
				<tbody>
					<table className="border-separate border-spacing-y-2 w-[calc(100%-32px)] m-4">
						{finalPools.map((pool) => (
							<tr key={JSON.stringify(pool)} className="p-3">
								<th className="rounded-l-md bg-[#eff0f3] dark:bg-[#17181c] p-2 text-sm font-normal">
									<span className="flex items-center gap-1">
										<TokenLogo logo={tokenIconUrl(pool.projectName)} size={20} />
										<span>{pool.projectName}</span>
									</span>
								</th>

								<td className="bg-[#eff0f3] dark:bg-[#17181c] p-2 text-sm font-normal">
									<span className="flex flex-col">
										<span>
											{(
												(borrow && collateral
													? incentives === 'true'
														? pool.apy + pool.borrow.apyBorrow * pool.ltv
														: pool.apyBase + pool.borrow.apyBaseBorrow * pool.ltv
													: borrow
													? incentives === 'true'
														? pool.borrow.apyBorrow
														: pool.borrow.apyBaseBorrow
													: incentives === 'true'
													? pool.apy
													: pool.apyBase) ?? 0
											).toLocaleString(undefined, { maximumFractionDigits: 2 })}
											%
										</span>
										<span className="text-xs opacity-70">
											{borrow && collateral ? 'Net APY' : borrow ? 'Net Borrow APY' : 'Net Supply APY'}
										</span>
									</span>
								</td>

								{/* <td>
									<span data-metric>
										<span>
											{pool.borrow.apyBaseBorrow && pool.ltv
												? (incentives === 'true' ? pool.borrow.apyBorrow : pool.borrow.apyBaseBorrow).toLocaleString(
														undefined,
														{ maximumFractionDigits: 2 }
												  ) + '%'
												: '-'}
										</span>
										<span>Cost</span>
									</span>
								</td>

								<td>
									<span data-metric>
										<span>{formattedNum(pool.borrow.totalAvailableUsd, true)}</span>
										<span>Available</span>
									</span>
								</td> */}

								<td className="rounded-r-md bg-[#eff0f3] dark:bg-[#17181c] p-2 text-sm font-normal">
									<span className="flex items-center justify-end gap-1">
										<TokenLogo logo={chainIconUrl(pool.chain)} size={20} />
										<span>{pool.chain}</span>
									</span>
								</td>
							</tr>
						))}
					</table>
				</tbody>
			)}
		</div>
	)
}
