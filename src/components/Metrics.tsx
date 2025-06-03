import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import metadataCache from '~/utils/metadata'
import { useMemo, useState } from 'react'
import { matchSorter } from 'match-sorter'

export interface ITotalTrackedByMetric {
	tvl: { protocols: number; chains: number }
	stablecoins: { protocols: number; chains: number }
	fees: { protocols: number; chains: number }
	revenue: { protocols: number; chains: number }
	holdersRevenue: { protocols: number; chains: number }
	dexs: { protocols: number; chains: number }
	dexAggregators: { protocols: number; chains: number }
	perps: { protocols: number; chains: number }
	perpAggregators: { protocols: number; chains: number }
	options: { protocols: number; chains: number }
	bridgeAggregators: { protocols: number; chains: number }
}

export type TMetric =
	| 'TVL'
	| 'Stablecoin Supply'
	| 'Fees'
	| 'Revenue'
	| 'Holders Revenue'
	| 'DEX Volume'
	| 'Perp Volume'
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

export const Metrics = ({ currentMetric, isChains }: { currentMetric: TMetric; isChains?: boolean }) => {
	const router = useRouter()
	const dialogStore = Ariakit.useDialogStore()
	const chain = router.query.chain as string
	const [tab, setTab] = useState<'Protocols' | 'Chains'>(isChains ? 'Chains' : 'Protocols')

	const [searchValue, setSearchValue] = useState('')

	const { chains, protocols } = useMemo(() => {
		if (searchValue.length < 2) {
			return { chains: chainsMetrics, protocols: protocolsMetrics }
		}

		const chains = matchSorter(chainsMetrics, searchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			keys: ['name'],
			threshold: matchSorter.rankings.CONTAINS
		})

		const protocols = matchSorter(protocolsMetrics, searchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			keys: ['name'],
			threshold: matchSorter.rankings.CONTAINS
		})

		return { chains, protocols }
	}, [searchValue])
	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<p
				className={`text-center ${
					currentMetric === 'Stablecoin Supply' && !isChains ? 'my-1' : 'mt-1 lg:-mt-2 mb-1'
				} flex items-center gap-1 justify-center flex-wrap relative w-full isolate rounded-md h-10 bg-[var(--cards-bg)] p-1`}
			>
				<img src="/icons/metrics-l.svg" width={189} height={82} alt="" className="rounded-l-md absolute left-0" />
				<span className="bg-[var(--old-blue)] text-white text-xs rounded-md py-[7px] items-center gap-2 px-2 hidden lg:flex">
					<Icon name="sparkles" height={12} width={12} />
					<span>New</span>
				</span>
				<Ariakit.DialogDisclosure className="py-1 px-[10px] border border-dashed border-[var(--old-blue)] bg-[rgba(31,103,210,0.12)] font-semibold rounded-md z-10">
					{currentMetric === 'CEX Assets' ? 'CEXs' : isChains ? 'Chains' : 'Protocols'}
				</Ariakit.DialogDisclosure>
				<span>ranked by </span>
				<Ariakit.DialogDisclosure className="py-1 px-[10px] border border-dashed border-[var(--old-blue)] bg-[rgba(31,103,210,0.12)] font-semibold rounded-md z-10">
					{currentMetric === 'CEX Assets' ? 'Assets' : currentMetric}
				</Ariakit.DialogDisclosure>
				<Ariakit.DialogDisclosure className="py-1 px-[6px] flex items-center gap-1 text-[#666] dark:text-[#919296] text-xs z-10">
					<Icon name="pencil" height={12} width={12} />
					<span>Click to change</span>
				</Ariakit.DialogDisclosure>
				<img src="/icons/metrics-r.svg" width={189} height={82} alt="" className="rounded-r-md absolute right-0" />
				<svg width="100%" height="100%" className="absolute top-0 left-0 z-0 text-[#e6e6e6] dark:text-[#222324]">
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
						width="calc(100% - 1px)"
						height="calc(100% - 1px)"
						rx="6"
						ry="6"
						fill="none"
						stroke="url(#border-gradient)"
						strokeWidth="1"
					/>
				</svg>
			</p>
			<Ariakit.Dialog
				className="dialog gap-3 sm:w-full sm:max-w-[min(85vw,1280px)] max-sm:drawer h-[70vh] lg:h-[calc(100vh-32px)]"
				unmountOnHide
			>
				<div className="p-1 bg-[var(--cards-bg)] rounded-md flex flex-col gap-2">
					<div className="flex items-center gap-2">
						<Ariakit.DialogHeading className="text-2xl font-bold">Metrics for</Ariakit.DialogHeading>
						<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border-[#E2E2E2] bg-[#E2E2E2] dark:bg-[#2A2C2E] dark:border-[#2A2C2E] p-1">
							{['Protocols', 'Chains'].map((dataType) => (
								<button
									onClick={() => setTab(dataType as 'Protocols' | 'Chains')}
									className="flex-shrink-0 py-1 px-[10px] min-h-8 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white rounded-md"
									data-active={tab === dataType}
									key={dataType}
								>
									{dataType}
								</button>
							))}
						</div>
						<Ariakit.DialogDismiss
							className="ml-auto p-2 -my-2 rounded-lg hover:bg-[var(--divider)] text-[var(--text3)] hover:text-[var(--text1)]"
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
							className="absolute text-[var(--text3)] top-0 bottom-0 my-auto left-2"
						/>
						<input
							type="text"
							placeholder="Search..."
							className="w-full border-[#E2E2E2] bg-[#E2E2E2] dark:bg-[#2A2C2E] dark:border-[#2A2C2E] p-[6px] pl-7 min-h-8 text-black dark:text-white placeholder:text-[#666] dark:placeholder:[#919296] rounded-md outline-none"
							value={searchValue}
							onChange={(e) => setSearchValue(e.target.value)}
						/>
					</div>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
					{tab === 'Chains' ? (
						<>
							{chains.map((metric) => (
								<BasicLink
									key={`chain-metric-${metric.name}`}
									className="p-[10px] rounded-md bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] col-span-1 flex flex-col items-start gap-[2px] hover:bg-[rgba(31,103,210,0.12)] min-h-[120px]"
									href={metric.route}
								>
									<span className="flex items-center gap-2 flex-wrap justify-between w-full">
										<span className="font-medium">{metric.name}</span>
										{metric.chainsTracked ? (
											<span className="text-xs text-[var(--link)]">{metric.chainsTracked} tracked</span>
										) : null}
									</span>
									<span className="text-[#666] dark:text-[#919296] text-start">{metric.description}</span>
								</BasicLink>
							))}
						</>
					) : (
						<>
							{protocols.map((metric) => (
								<BasicLink
									key={`protocol-metric-${metric.name}`}
									className="p-[10px] rounded-md bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] col-span-1 flex flex-col items-start gap-[2px] hover:bg-[rgba(31,103,210,0.12)] min-h-[120px]"
									href={
										chain && metric.chainRoute ? `${metric.chainRoute.replace('{chain}', chain)}` : metric.mainRoute
									}
								>
									<span className="flex items-center gap-2 flex-wrap justify-between w-full">
										<span className="font-medium">{metric.name}</span>
										{metric.protocolsTracked ? (
											<span className="text-xs text-[var(--link)]">{metric.protocolsTracked} tracked</span>
										) : null}
									</span>
									<span className="text-[#666] dark:text-[#919296] text-start">{metric.description}</span>
								</BasicLink>
							))}
						</>
					)}
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}

export const protocolsMetrics: Array<{
	name: TMetric
	mainRoute: string
	chainRoute: string
	protocolsTracked: number
	description: string
}> = [
	{
		name: 'TVL',
		mainRoute: '/',
		chainRoute: `/chain/{chain}`,
		protocolsTracked: metadataCache.totalTrackedByMetric.tvl.protocols,
		description: 'Total value of all coins held in smart contracts of the protocols'
	},
	{
		name: 'Fees',
		mainRoute: '/fees',
		chainRoute: `/fees/chain/{chain}`,
		protocolsTracked: metadataCache.totalTrackedByMetric.fees.protocols,
		description: 'Total fees paid by users when using the protocol'
	},
	{
		name: 'Revenue',
		mainRoute: '/revenue',
		chainRoute: `/revenue/chain/{chain}`,
		protocolsTracked: metadataCache.totalTrackedByMetric.revenue.protocols,
		description:
			"Subset of fees that the protocol collects for itself, usually going to the protocol treasury, the team or distributed among token holders. This doesn't include any fees distributed to Liquidity Providers"
	},
	{
		name: 'Holders Revenue',
		mainRoute: '/holders-revenue',
		chainRoute: `/holders-revenue/chain/{chain}`,
		protocolsTracked: metadataCache.totalTrackedByMetric.holdersRevenue.protocols,
		description:
			'Subset of revenue that is distributed to token holders by means of buyback and burn, burning fees or direct distribution to stakers'
	},
	{
		name: 'Stablecoin Supply',
		mainRoute: '/stablecoins',
		chainRoute: `/stablecoins/{chain}`,
		protocolsTracked: metadataCache.totalTrackedByMetric.stablecoins.protocols,
		description: 'Total market cap of stable assets currently deployed on the chain'
	},
	{
		name: 'DEX Volume',
		mainRoute: '/dexs',
		chainRoute: `/dexs/chain/{chain}`,
		protocolsTracked: metadataCache.totalTrackedByMetric.dexs.protocols,
		description: 'Volume of all spot token swaps that go through a DEX'
	},
	{
		name: 'Total Borrowed',
		mainRoute: '/total-borrowed',
		chainRoute: `/total-borrowed/chain/{chain}`,
		protocolsTracked: metadataCache.totalTrackedByMetric.lending.protocols,
		description: 'Sum of value currently borrowed across all active loans on a Lending protocol'
	},
	{
		name: 'Net Project Treasury',
		mainRoute: '/net-project-treasury',
		chainRoute: null,
		protocolsTracked: metadataCache.totalTrackedByMetric.treasury.protocols,
		description: "Value of tokens owned by a protocol, excluding it's own token"
	},
	{
		name: 'Perp Volume',
		mainRoute: '/perps',
		chainRoute: `/perps/chain/{chain}`,
		protocolsTracked: metadataCache.totalTrackedByMetric.perps.protocols,
		description: 'Notional volume of all trades in a perp exchange, includes leverage'
	},
	{
		name: 'Total Raised',
		mainRoute: '/raises',
		chainRoute: `/raises?chain={chain}`,
		protocolsTracked: 0,
		description: 'Total amount of capital raised by a protocol'
	},
	{
		name: 'Oracle TVS',
		mainRoute: '/oracles',
		chainRoute: `/oracles/chain/{chain}`,
		protocolsTracked: 0,
		description: 'Total Value Secured by an oracle, where oracle failure would lead to a loss equal to TVS'
	},
	{
		name: 'TVL in forks',
		mainRoute: '/forks',
		chainRoute: null,
		protocolsTracked: 0,
		description: 'Sum of TVL across all forks of a protocol'
	},
	{
		name: 'DEX Aggregator Volume',
		mainRoute: '/dex-aggregators',
		chainRoute: `/dex-aggregators/chain/{chain}`,
		protocolsTracked: metadataCache.totalTrackedByMetric.dexAggregators.protocols,
		description: 'Volume of spot token swaps that go through a DEX aggregator'
	},
	{
		name: 'CEX Assets',
		mainRoute: '/cexs',
		chainRoute: null,
		protocolsTracked: 0,
		description: 'Sum of assets held on a centralized exchange such as Binance'
	},
	{
		name: 'Options Premium Volume',
		mainRoute: '/options/premium-volume',
		chainRoute: `/options/premium-volume/chain/{chain}`,
		protocolsTracked: metadataCache.totalTrackedByMetric.options.protocols,
		description: 'Sum of value paid buying and selling options'
	},
	{
		name: 'Options Notional Volume',
		mainRoute: '/options/notional-volume',
		chainRoute: `/options/notional-volume/chain/{chain}`,
		protocolsTracked: metadataCache.totalTrackedByMetric.options.protocols,
		description: 'Sum of the notional value of all options that have been traded on an options exchange'
	},
	{
		name: 'Bridge Aggregator Volume',
		mainRoute: '/bridge-aggregators',
		chainRoute: `/bridge-aggregators/chain/{chain}`,
		protocolsTracked: metadataCache.totalTrackedByMetric.bridgeAggregators.protocols,
		description: 'Sum of value of all assets that were bridged through the Bridge Aggregators'
	},
	{
		name: 'Perp Aggregator Volume',
		mainRoute: '/perps-aggregators',
		chainRoute: `/perps-aggregators/chain/{chain}`,
		protocolsTracked: metadataCache.totalTrackedByMetric.perpAggregators.protocols,
		description: 'Notional volume of all trades in a perp aggregator, includes leverage'
	},
	{
		name: 'Unlocks',
		mainRoute: '/unlocks',
		chainRoute: null,
		protocolsTracked: metadataCache.totalTrackedByMetric.emissions.protocols,
		description:
			'Tracks the release of locked tokens into circulation according to tokenomics schedules. Includes team, investor, ecosystem, and other vesting-based unlocks'
	}
]

export const chainsMetrics: Array<{
	name: string
	route: string
	chainsTracked: number
	description: string
}> = [
	{
		name: 'TVL',
		route: `/chains`,
		chainsTracked: metadataCache.totalTrackedByMetric.tvl.chains,
		description: 'Total value of all coins held in smart contracts of the protocols'
	},
	{
		name: 'Fees',
		route: '/fees/chains',
		chainsTracked: metadataCache.totalTrackedByMetric.fees.chains,
		description: 'Total fees paid by users when using the protocol'
	},
	{
		name: 'Revenue',
		route: '/revenue/chains',
		chainsTracked: metadataCache.totalTrackedByMetric.revenue.chains,
		description:
			"Subset of fees that the protocol collects for itself, usually going to the protocol treasury, the team or distributed among token holders. This doesn't include any fees distributed to Liquidity Providers"
	},
	{
		name: 'REV',
		route: '/rev/chains',
		chainsTracked: metadataCache.totalTrackedByMetric.fees.chains,
		description: 'Sum of chain fees and MEV tips'
	},
	{
		name: 'Bridged TVL',
		route: '/bridged',
		chainsTracked: 0,
		description: 'Value of all tokens held on the chain'
	},
	{
		name: 'App Revenue',
		route: '/app-revenue/chains',
		chainsTracked: metadataCache.totalTrackedByMetric.fees.chains,
		description: 'Total revenue earned by the apps on the chain. Excludes liquid staking apps and gas fees'
	},
	{
		name: 'Stablecoin Supply',
		route: `/stablecoins/chains`,
		chainsTracked: metadataCache.totalTrackedByMetric.stablecoins.chains,
		description: 'Total market cap of stable assets currently deployed on all chains'
	},
	{
		name: 'DEX Volume',
		route: '/dexs/chains',
		chainsTracked: metadataCache.totalTrackedByMetric.dexs.chains,
		description: 'Volume of all spot token swaps that go through a DEX'
	},
	{
		name: 'Perp Volume',
		route: '/perps/chains',
		chainsTracked: metadataCache.totalTrackedByMetric.perps.chains,
		description: 'Notional volume of all trades in a perp exchange, includes leverage'
	},
	{
		name: 'NFT Volume',
		route: '/nfts/chains',
		chainsTracked: 0,
		description: 'Sum of volume across all NFT exchanges'
	},
	{
		name: 'Total Raised',
		route: '/raises',
		chainsTracked: 0,
		description: 'Total amount of capital raised by a protocol'
	}
]
