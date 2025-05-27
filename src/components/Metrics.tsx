import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import metadataCache from '~/utils/metadata'
import { useState } from 'react'

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

export const Metrics = ({ currentMetric, isChains }: { currentMetric: TMetric; isChains?: boolean }) => {
	const router = useRouter()
	const dialogStore = Ariakit.useDialogStore()
	const chain = router.query.chain as string
	const [tab, setTab] = useState<'Protocols' | 'Chains'>(isChains ? 'Chains' : 'Protocols')

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<p
				className={`text-center ${
					currentMetric === 'Stablecoin Supply' && !isChains ? 'my-1' : '-mt-2 mb-1'
				} flex items-center gap-1 justify-center flex-wrap`}
			>
				<Ariakit.DialogDisclosure className="py-1 px-[10px] border border-dashed border-[var(--old-blue)] bg-[rgba(31,103,210,0.12)] font-semibold rounded-md">
					{isChains ? 'Chains' : 'Protocols'}
				</Ariakit.DialogDisclosure>
				<span>ranked by </span>
				<Ariakit.DialogDisclosure className="py-1 px-[10px] border border-dashed border-[var(--old-blue)] bg-[rgba(31,103,210,0.12)] font-semibold rounded-md">
					{currentMetric}
				</Ariakit.DialogDisclosure>
				<Ariakit.DialogDisclosure className="py-1 px-[6px] flex items-center gap-1 text-[#666] dark:text-[#919296] text-xs">
					<Icon name="pencil" height={12} width={12} />
					<span>Click to change</span>
				</Ariakit.DialogDisclosure>
			</p>
			<Ariakit.Dialog className="dialog gap-3 sm:w-full sm:max-w-[min(85vw,1280px)] max-sm:drawer" unmountOnHide>
				<Ariakit.DialogDismiss
					className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[var(--divider)] text-[var(--text3)] hover:text-[var(--text1)]"
					aria-label="Close modal"
				>
					<Icon name="x" height={20} width={20} />
				</Ariakit.DialogDismiss>
				<div className="flex items-center gap-2">
					<Ariakit.DialogHeading className="text-2xl font-bold">Metrics for</Ariakit.DialogHeading>
					<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border border-[var(--form-control-border)] text-[#666] dark:text-[#919296]">
						{['Protocols', 'Chains'].map((dataType) => (
							<button
								onClick={() => setTab(dataType as 'Protocols' | 'Chains')}
								className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
								data-active={tab === dataType}
								key={dataType}
							>
								{dataType}
							</button>
						))}
					</div>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
					{tab === 'Chains' ? (
						<>
							{chainsMetrics.map((metric) => (
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
							{protocolsMetrics.map((metric) => (
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

const protocolsMetrics: Array<{
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
		name: 'DEX Aggregator Volume',
		mainRoute: '/dex-aggregators',
		chainRoute: `/dex-aggregators/chain/{chain}`,
		protocolsTracked: metadataCache.totalTrackedByMetric.dexAggregators.protocols,
		description: 'Volume of spot token swaps that go through a DEX aggregator'
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
	}
]

const chainsMetrics: Array<{
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
	}
]
