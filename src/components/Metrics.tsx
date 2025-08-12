import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { matchSorter } from 'match-sorter'
import { useQuery } from '@tanstack/react-query'
import { TOTAL_TRACKED_BY_METRIC_API } from '~/constants'
import { fetchJson } from '~/utils/async'

export interface ITotalTrackedByMetric {
	tvl: { protocols: number; chains: number }
	stablecoins: { protocols: number; chains: number }
	fees: { protocols: number; chains: number }
	revenue: { protocols: number; chains: number }
	holdersRevenue: { protocols: number; chains: number }
	dexs: { protocols: number; chains: number }
	dexAggregators: { protocols: number; chains: number }
	perps: { protocols: number; chains: number }
	perpsOpenInterest: { protocols: number; chains: number }
	perpAggregators: { protocols: number; chains: number }
	options: { protocols: number; chains: number }
	bridgeAggregators: { protocols: number; chains: number }
	lending: { protocols: number; chains: number }
	treasury: { protocols: number; chains: number }
	emissions: { protocols: number; chains: number }
	oracles: { protocols: number; chains: number }
	forks: { protocols: number; chains: number }
	cexs: { protocols: number; chains: number }
	nfts: { protocols: number; chains: number }
	bridgedTVL: { protocols: number; chains: number }
	staking: { protocols: number; chains: number }
	pool2: { protocols: number; chains: number }
	mcap: { protocols: number; chains: number }
	fdv: { protocols: number; chains: number }
	adjustedFDV: { protocols: number; chains: number }
	pf: { protocols: number; chains: number }
	ps: { protocols: number; chains: number }
	price: { protocols: number; chains: number }
	totalValueLostInHacks: { protocols: number; chains: number }
}

export type TMetric =
	| 'TVL'
	| 'Stablecoin Supply'
	| 'Fees'
	| 'Revenue'
	| 'Holders Revenue'
	| 'DEX Volume'
	| 'Perp Volume'
	| 'Open Interest'
	| 'DEX Aggregator Volume'
	| 'Perp Aggregator Volume'
	| 'Options Premium Volume'
	| 'Options Notional Volume'
	| 'Bridge Aggregator Volume'
	| 'Total Borrowed'
	| 'Net Project Treasury'
	| 'App Revenue'
	| 'Oracle TVS'
	| 'TVL in forks'
	| 'CEX Assets'
	| 'Total Raised'
	| 'Bridged TVL'
	| 'NFT Volume'
	| 'REV'
	| 'Unlocks'
	| 'Earnings'
	| 'Total Staked'
	| 'Pool2 TVL'
	| 'Market Cap'
	| 'P/F'
	| 'P/S'
	| 'Token Price'
	| 'Treasury'
	| 'Total Value Lost in Hacks'
	| 'FDV'
	| 'Outstanding FDV'

export const Metrics = ({ currentMetric, isChains }: { currentMetric: TMetric; isChains?: boolean }) => {
	const router = useRouter()
	const dialogStore = Ariakit.useDialogStore()
	const chain = router.query.chain as string
	const [tab, setTab] = useState<'Protocols' | 'Chains'>(isChains ? 'Chains' : 'Protocols')

	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)

	const { chains, protocols } = useMemo(() => {
		if (searchValue.length < 2) {
			return { chains: chainsMetrics, protocols: protocolsMetrics }
		}

		const chains = matchSorter(chainsMetrics, deferredSearchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			keys: ['category', 'pages.*.name', 'pages.*.description'],
			threshold: matchSorter.rankings.CONTAINS
		})
			.map((category) => ({
				...category,
				pages: category.pages.filter(
					(page) =>
						matchSorter([page], deferredSearchValue, {
							keys: ['name', 'description'],
							threshold: matchSorter.rankings.CONTAINS
						}).length > 0
				)
			}))
			.filter((category) => category.pages.length > 0)

		const protocols = matchSorter(protocolsMetrics, deferredSearchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			keys: ['category', 'pages.*.name', 'pages.*.description'],
			threshold: matchSorter.rankings.CONTAINS
		})
			.map((category) => ({
				...category,
				pages: category.pages.filter(
					(page) =>
						matchSorter([page], deferredSearchValue, {
							keys: ['name', 'description'],
							threshold: matchSorter.rankings.CONTAINS
						}).length > 0
				)
			}))
			.filter((category) => category.category !== 'Trending 🔥' && category.pages.length > 0)

		return { chains, protocols }
	}, [deferredSearchValue])

	useEffect(() => {
		const handleRouteChange = () => {
			dialogStore.hide()
		}

		router.events.on('routeChangeComplete', handleRouteChange)

		// If the component is unmounted, unsubscribe
		// from the event with the `off` method:
		return () => {
			router.events.off('routeChangeComplete', handleRouteChange)
		}
	}, [router, dialogStore])

	const { data: totalTrackedByMetric } = useQuery({
		queryKey: ['totalTrackedByMetric'],
		queryFn: () => fetchJson(TOTAL_TRACKED_BY_METRIC_API),
		staleTime: 60 * 60 * 1000
	})

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<div className="relative w-full isolate rounded-md bg-(--cards-bg) p-1 h-10">
				<img
					src="/icons/metrics-l.svg"
					width={92}
					height={40}
					alt=""
					className="rounded-l-md absolute left-0 top-0 h-full w-auto object-cover"
					fetchPriority="high"
				/>
				<div className="flex items-center gap-1 justify-center flex-wrap h-full">
					<span className="bg-(--old-blue) text-white text-xs rounded-md py-[7px] items-center gap-2 px-2 hidden lg:flex">
						<Icon name="sparkles" height={12} width={12} />
						<span>New</span>
					</span>
					<Ariakit.DialogDisclosure className="py-1 px-[10px] border border-dashed border-(--old-blue) bg-[rgba(31,103,210,0.12)] font-semibold rounded-md z-10">
						{currentMetric === 'CEX Assets' ? 'CEXs' : isChains ? 'Chains' : 'Protocols'}
					</Ariakit.DialogDisclosure>
					<span>ranked by </span>
					<Ariakit.DialogDisclosure className="py-1 px-[10px] border border-dashed border-(--old-blue) bg-[rgba(31,103,210,0.12)] font-semibold rounded-md z-10">
						{currentMetric === 'CEX Assets' ? 'Assets' : currentMetric}
					</Ariakit.DialogDisclosure>
					<Ariakit.DialogDisclosure className="py-1 px-[6px] flex items-center gap-1 text-[#666] dark:text-[#919296] text-xs z-10">
						<Icon name="search" height={12} width={12} />
						<span className="hidden sm:block">Click to browse & search</span>
					</Ariakit.DialogDisclosure>
				</div>
				<img
					src="/icons/metrics-r.svg"
					width={92}
					height={40}
					alt=""
					className="rounded-r-md absolute right-0 top-0 h-full w-auto object-cover"
					fetchPriority="high"
				/>
				<svg
					width="100%"
					height="100%"
					className="absolute top-0 left-0 right-0 bottom-0 z-0 text-[#e6e6e6] dark:text-[#222324]"
				>
					<defs>
						<linearGradient id="border-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
							<stop offset="0%" stopColor="#1f67d2" />
							<stop offset="8%" stopColor="#1f67d2" />
							<stop offset="18%" stopColor="currentColor" />
							<stop offset="82%" stopColor="currentColor" />
							<stop offset="92%" stopColor="#1f67d2" />
							<stop offset="100%" stopColor="#1f67d2" />
						</linearGradient>
					</defs>
					<rect
						x="1"
						y="1"
						width="calc(100% - 1.5px)"
						height="calc(100% - 1.5px)"
						rx="6"
						ry="6"
						fill="none"
						stroke="url(#border-gradient)"
						strokeWidth="1"
					/>
				</svg>
			</div>
			<Ariakit.Dialog
				className="dialog gap-3 sm:w-full sm:max-w-[min(85vw,1280px)] max-sm:drawer h-[70vh] lg:h-[calc(100vh-32px)]"
				unmountOnHide
			>
				<div className="p-1 bg-(--cards-bg) rounded-md flex flex-col gap-2">
					<div className="flex items-center gap-2">
						<Ariakit.DialogHeading className="text-2xl font-bold">Metrics for</Ariakit.DialogHeading>
						<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border-[#E2E2E2] bg-[#E2E2E2] dark:bg-[#2A2C2E] dark:border-[#2A2C2E] p-1">
							{['Protocols', 'Chains'].map((dataType) => (
								<button
									onClick={() => setTab(dataType as 'Protocols' | 'Chains')}
									className="shrink-0 py-1 px-[10px] min-h-8 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white rounded-md"
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
						>
							<Icon name="x" height={20} width={20} />
						</Ariakit.DialogDismiss>
					</div>
					<div className="relative">
						<Icon
							name="search"
							height={16}
							width={16}
							className="absolute text-(--text3) top-0 bottom-0 my-auto left-2"
						/>
						<input
							type="text"
							placeholder="Search..."
							className="w-full border-[#E2E2E2] bg-[#E2E2E2] dark:bg-[#2A2C2E] dark:border-[#2A2C2E] p-[6px] pl-7 min-h-8 text-black dark:text-white placeholder:text-[#666] dark:placeholder:[#919296] rounded-md outline-hidden"
							value={searchValue}
							onChange={(e) => setSearchValue(e.target.value)}
						/>
					</div>
				</div>
				<div>
					{tab === 'Chains' ? (
						<>
							{chains.map(({ category, pages }) => (
								<div key={`chain-metrics-category-${category}`} className="group">
									{category ? (
										<div className="flex items-center flex-nowrap gap-4 my-2 group-first:mt-0">
											<h1 className="text-lg font-bold">{category}</h1>
											<div className="h-[1px] flex-1 border border-(--cards-border)" />
										</div>
									) : null}
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
										{pages.map((metric) => (
											<BasicLink
												key={`chain-metric-${category}-${metric.name}`}
												className="p-[10px] rounded-md bg-(--cards-bg) border border-(--cards-border) col-span-1 flex flex-col items-start gap-[2px] hover:bg-[rgba(31,103,210,0.12)] min-h-[120px]"
												href={metric.route}
											>
												<p className="flex items-center gap-2 flex-wrap justify-between w-full">
													<span className="font-medium">{metric.name}</span>
													{totalTrackedByMetric && metric.chainsTracked(totalTrackedByMetric) ? (
														<span className="text-xs text-(--link)">
															{metric.chainsTracked(totalTrackedByMetric)} tracked
														</span>
													) : null}
												</p>
												<p className="text-[#666] dark:text-[#919296] text-start whitespace-pre-wrap">
													{metric.description}
												</p>
											</BasicLink>
										))}
									</div>
								</div>
							))}
						</>
					) : (
						<>
							{protocols.map(({ category, pages }) => (
								<div key={`protocol-metrics-category-${category}`} className="group">
									{category ? (
										<div className="flex items-center flex-nowrap gap-4 my-2 group-first:mt-0">
											<h1 className="text-lg font-bold">{category}</h1>
											<div className="h-[1px] flex-1 border border-(--cards-border)" />
										</div>
									) : null}
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
										{pages.map((metric) => (
											<BasicLink
												key={`protocol-metric-${category}-${metric.name}`}
												className="p-[10px] rounded-md bg-(--cards-bg) border border-(--cards-border) col-span-1 flex flex-col items-start gap-[2px] hover:bg-[rgba(31,103,210,0.12)] min-h-[120px]"
												href={
													chain && metric.chainRoute
														? `${metric.chainRoute.replace('{chain}', chain)}`
														: metric.mainRoute
												}
											>
												<p className="flex items-center gap-2 flex-wrap justify-between w-full">
													<span className="font-medium">{metric.name}</span>
													{totalTrackedByMetric && metric.protocolsTracked(totalTrackedByMetric) ? (
														<span className="text-xs text-(--link)">
															{metric.protocolsTracked(totalTrackedByMetric)} tracked
														</span>
													) : null}
												</p>
												<p className="text-[#666] dark:text-[#919296] text-start whitespace-pre-wrap">
													{metric.description}
												</p>
											</BasicLink>
										))}
									</div>
								</div>
							))}
						</>
					)}
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}

export const protocolsMetrics: Array<{
	category: string
	pages: Array<{
		name: TMetric
		mainRoute: string
		chainRoute: string
		protocolsTracked: (totalTrackedByMetric: ITotalTrackedByMetric) => number
		description: string
	}>
}> = [
	{
		category: 'Trending 🔥',
		pages: [
			{
				name: 'TVL',
				mainRoute: '/',
				chainRoute: `/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.tvl?.protocols ?? 0,
				description: 'Total value of all coins held in smart contracts of the protocols'
			},
			{
				name: 'Fees',
				mainRoute: '/fees',
				chainRoute: `/fees/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.fees?.protocols ?? 0,
				description: 'Total fees paid by users when using the protocol'
			},
			{
				name: 'DEX Volume',
				mainRoute: '/dexs',
				chainRoute: `/dexs/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.dexs?.protocols ?? 0,
				description: 'Volume of all spot token swaps that go through a DEX'
			}
		]
	},
	{
		category: 'Fees & Revenue',
		pages: [
			{
				name: 'Fees',
				mainRoute: '/fees',
				chainRoute: `/fees/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.fees?.protocols ?? 0,
				description: 'Total fees paid by users when using the protocol'
			},
			{
				name: 'Revenue',
				mainRoute: '/revenue',
				chainRoute: `/revenue/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.revenue?.protocols ?? 0,
				description:
					"Subset of fees that the protocol collects for itself, usually going to the protocol treasury, the team or distributed among token holders. This doesn't include any fees distributed to Liquidity Providers"
			},
			{
				name: 'Holders Revenue',
				mainRoute: '/holders-revenue',
				chainRoute: `/holders-revenue/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.holdersRevenue?.protocols ?? 0,
				description:
					'Subset of revenue that is distributed to token holders by means of buyback and burn, burning fees or direct distribution to stakers'
			},
			{
				name: 'Earnings',
				mainRoute: '/earnings',
				chainRoute: null,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.revenue?.protocols ?? 0,
				description:
					'Net revenue retained by the protocol after subtracting token incentives distributed to users. Calculated as Revenue minus Incentives (emissions paid out through liquidity mining, farming programs, or similar rewards). Reflects the actual economic value accrued to the protocol itself.'
			},
			{
				name: 'P/F',
				mainRoute: '/pf',
				chainRoute: null,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.pf?.protocols ?? 0,
				description: 'Market cap / annualized fees'
			},
			{
				name: 'P/S',
				mainRoute: '/ps',
				chainRoute: null,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.ps?.protocols ?? 0,
				description: 'Market cap / annualized revenue'
			}
		]
	},
	{
		category: 'Volume',
		pages: [
			{
				name: 'DEX Volume',
				mainRoute: '/dexs',
				chainRoute: `/dexs/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.dexs?.protocols ?? 0,
				description: 'Volume of all spot token swaps that go through a DEX'
			},
			{
				name: 'Perp Volume',
				mainRoute: '/perps',
				chainRoute: `/perps/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.perps?.protocols ?? 0,
				description: 'Notional volume of all trades in a perp exchange, includes leverage'
			},
			{
				name: 'Open Interest',
				mainRoute: '/open-interest',
				chainRoute: `/open-interest/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.perpsOpenInterest?.protocols ?? 0,
				description: 'Total notional value of all outstanding perpetual futures positions'
			},
			{
				name: 'DEX Aggregator Volume',
				mainRoute: '/dex-aggregators',
				chainRoute: `/dex-aggregators/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.dexAggregators?.protocols ?? 0,
				description: 'Volume of spot token swaps that go through a DEX aggregator'
			},
			{
				name: 'Options Premium Volume',
				mainRoute: '/options/premium-volume',
				chainRoute: `/options/premium-volume/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.options?.protocols ?? 0,
				description: 'Sum of value paid buying and selling options'
			},
			{
				name: 'Options Notional Volume',
				mainRoute: '/options/notional-volume',
				chainRoute: `/options/notional-volume/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.options?.protocols ?? 0,
				description: 'Sum of the notional value of all options that have been traded on an options exchange'
			},
			{
				name: 'Bridge Aggregator Volume',
				mainRoute: '/bridge-aggregators',
				chainRoute: `/bridge-aggregators/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.bridgeAggregators?.protocols ?? 0,
				description: 'Sum of value of all assets that were bridged through the Bridge Aggregators'
			},
			{
				name: 'Perp Aggregator Volume',
				mainRoute: '/perps-aggregators',
				chainRoute: `/perps-aggregators/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.perpAggregators?.protocols ?? 0,
				description: 'Notional volume of all trades in a perp aggregator, includes leverage'
			}
		]
	},
	{
		category: 'Treasury',
		pages: [
			{
				name: 'Net Project Treasury',
				mainRoute: '/net-project-treasury',
				chainRoute: null,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.treasury?.protocols ?? 0,
				description: "Value of tokens owned by a protocol, excluding it's own token"
			},
			{
				name: 'Treasury',
				mainRoute: '/treasuries',
				chainRoute: null,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.treasury?.protocols ?? 0,
				description: "Value of tokens owned by a protocol, including it's own token and breakdown of assets held"
			}
		]
	},
	{
		category: 'Total Value',
		pages: [
			{
				name: 'TVL',
				mainRoute: '/',
				chainRoute: `/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.tvl?.protocols ?? 0,
				description: 'Total value of all coins held in smart contracts of the protocols'
			},
			{
				name: 'Total Borrowed',
				mainRoute: '/total-borrowed',
				chainRoute: `/total-borrowed/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.lending?.protocols ?? 0,
				description: 'Sum of value currently borrowed across all active loans on a Lending protocol'
			},
			{
				name: 'Oracle TVS',
				mainRoute: '/oracles',
				chainRoute: `/oracles/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.oracles?.protocols ?? 0,
				description: 'Total Value Secured by an oracle, where oracle failure would lead to a loss equal to TVS'
			},
			{
				name: 'TVL in forks',
				mainRoute: '/forks',
				chainRoute: null,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.forks?.protocols ?? 0,
				description: 'Sum of TVL across all forks of a protocol'
			},
			{
				name: 'Total Staked',
				mainRoute: '/total-staked',
				chainRoute: `/total-staked/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.staking?.protocols ?? 0,
				description: 'Total value of protocols own tokens staked on their platform'
			},
			{
				name: 'Pool2 TVL',
				mainRoute: '/pool2',
				chainRoute: `/pool2/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.pool2?.protocols ?? 0,
				description: 'Total value locked in pool2 of a protocol'
			}
		]
	},
	{
		category: 'Token',
		pages: [
			{
				name: 'Unlocks',
				mainRoute: '/unlocks',
				chainRoute: null,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.emissions?.protocols ?? 0,
				description:
					'Tracks the release of locked tokens into circulation according to tokenomics schedules. Includes team, investor, ecosystem, and other vesting-based unlocks'
			},
			{
				name: 'Market Cap',
				mainRoute: '/mcaps',
				chainRoute: `/mcaps/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.mcap?.protocols ?? 0,
				description: 'Token price multiplied by circulating supply'
			},
			{
				name: 'FDV',
				mainRoute: '/fdv',
				chainRoute: `/fdv/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.fdv?.protocols ?? 0,
				description: 'Token price multiplied by fully diluted supply'
			},
			{
				name: 'Outstanding FDV',
				mainRoute: '/outstanding-fdv',
				chainRoute: `/outstanding-fdv/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.adjustedFDV?.protocols ?? 0,
				description: `Token price multiplied by outstanding supply. Outstanding supply is the total supply minus the supply that is not yet allocated to anything (eg coins in treasury or reserve).`
			},
			{
				name: 'Token Price',
				mainRoute: '/token-prices',
				chainRoute: `/token-prices/chain/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.price?.protocols ?? 0,
				description: 'Price of the protocol token'
			}
		]
	},
	{
		category: 'Others',
		pages: [
			{
				name: 'Stablecoin Supply',
				mainRoute: '/stablecoins',
				chainRoute: `/stablecoins/{chain}`,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.stablecoins?.protocols ?? 0,
				description: 'Total market cap of stable assets currently deployed on the chain'
			},
			{
				name: 'Total Raised',
				mainRoute: '/raises',
				chainRoute: `/raises?chain={chain}`,
				protocolsTracked: () => 0,
				description: 'Total amount of capital raised by a protocol'
			},
			{
				name: 'CEX Assets',
				mainRoute: '/cexs',
				chainRoute: null,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.cexs?.protocols ?? 0,
				description: 'Sum of assets held on a centralized exchange such as Binance'
			},
			{
				name: 'Total Value Lost in Hacks',
				mainRoute: '/hacks/total-value-lost',
				chainRoute: null,
				protocolsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.totalValueLostInHacks?.protocols ?? 0,
				description: 'Total value lost in hacks by a protocol'
			}
		]
	}
]

export const chainsMetrics: Array<{
	category: string
	pages: Array<{
		name: string
		route: string
		chainsTracked: (totalTrackedByMetric: ITotalTrackedByMetric) => number
		description: string
	}>
}> = [
	{
		category: '',
		pages: [
			{
				name: 'TVL',
				route: `/chains`,
				chainsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.tvl?.chains ?? 0,
				description: 'Total value of all coins held in smart contracts of the protocols'
			},
			{
				name: 'Fees',
				route: '/fees/chains',
				chainsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.fees?.chains ?? 0,
				description: 'Total fees paid by users when using the protocol'
			},
			{
				name: 'Revenue',
				route: '/revenue/chains',
				chainsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.revenue?.chains ?? 0,
				description:
					"Subset of fees that the protocol collects for itself, usually going to the protocol treasury, the team or distributed among token holders. This doesn't include any fees distributed to Liquidity Providers"
			},
			{
				name: 'REV',
				route: '/rev/chains',
				chainsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.fees?.chains ?? 0,
				description: 'Sum of chain fees and MEV tips'
			},
			{
				name: 'Bridged TVL',
				route: '/bridged',
				chainsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.bridgedTVL?.chains ?? 0,
				description: 'Value of all tokens held on the chain'
			},
			{
				name: 'App Revenue',
				route: '/app-revenue/chains',
				chainsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.fees?.chains ?? 0,
				description: 'Total revenue earned by the apps on the chain. Excludes liquid staking apps and gas fees'
			},
			{
				name: 'Stablecoin Supply',
				route: `/stablecoins/chains`,
				chainsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.stablecoins?.chains ?? 0,
				description: 'Total market cap of stable assets currently deployed on all chains'
			},
			{
				name: 'DEX Volume',
				route: '/dexs/chains',
				chainsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.dexs?.chains ?? 0,
				description: 'Volume of all spot token swaps that go through a DEX'
			},
			{
				name: 'Perp Volume',
				route: '/perps/chains',
				chainsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.perps?.chains ?? 0,
				description: 'Notional volume of all trades in a perp exchange, includes leverage'
			},
			{
				name: 'NFT Volume',
				route: '/nfts/chains',
				chainsTracked: (totalTrackedByMetric) => totalTrackedByMetric?.nfts?.chains ?? 0,
				description: 'Sum of volume across all NFT exchanges'
			},
			{
				name: 'Total Raised',
				route: '/raises',
				chainsTracked: () => 0,
				description: 'Total amount of capital raised by a protocol'
			}
		]
	}
]
