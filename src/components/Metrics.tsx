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
	| 'Stablecoins'
	| 'Fees'
	| 'Revenue'
	| 'Holders Revenue'
	| 'DEXs'
	| 'DEX Aggregators'
	| 'Perps'
	| 'Perps Aggregators'
	| 'Options Premium Volume'
	| 'Options Notional Volume'
	| 'Bridge Aggregators'

export const Metrics = ({ currentMetric, isChains }: { currentMetric: TMetric; isChains?: boolean }) => {
	const router = useRouter()
	const dialogStore = Ariakit.useDialogStore()
	const chain = router.query.chain as string
	const [tab, setTab] = useState<'Protocols' | 'Chains'>(isChains ? 'Chains' : 'Protocols')

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<p
				className={`text-center ${
					currentMetric === 'Stablecoins' && !isChains ? 'my-1' : '-mt-2 mb-1'
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
							{allMetrics
								.filter((c) => c.chainsRoute)
								.map((metric) => (
									<BasicLink
										key={`chain-metric-${metric.name}`}
										className="p-[10px] rounded-md bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] col-span-1 flex flex-col items-start gap-[2px] hover:bg-[rgba(31,103,210,0.12)] min-h-[120px]"
										href={metric.chainsRoute}
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
							{allMetrics.map((metric) => (
								<BasicLink
									key={`chain-metric-${metric.name}`}
									className="p-[10px] rounded-md bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] col-span-1 flex flex-col items-start gap-[2px] hover:bg-[rgba(31,103,210,0.12)] min-h-[120px]"
									href={chain ? `${metric.protocolsRoute.replace('{chain}', chain)}` : metric.mainRoute}
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

const allMetrics: Array<{
	name: TMetric
	mainRoute: string
	protocolsRoute: string
	chainsRoute: string | null
	protocolsTracked: number
	chainsTracked: number
	description: string
}> = [
	{
		name: 'TVL',
		mainRoute: '/',
		protocolsRoute: `/chain/{chain}`,
		chainsRoute: `/chains`,
		protocolsTracked: metadataCache.totalTrackedByMetric.tvl.protocols,
		chainsTracked: metadataCache.totalTrackedByMetric.tvl.chains,
		description: 'Total value of all coins held in smart contracts of the protocols'
	},
	{
		name: 'Stablecoins',
		mainRoute: '/stablecoins',
		protocolsRoute: `/stablecoins/{chain}`,
		chainsRoute: `/stablecoins/chains`,
		protocolsTracked: metadataCache.totalTrackedByMetric.stablecoins.protocols,
		chainsTracked: metadataCache.totalTrackedByMetric.stablecoins.chains,
		description: 'Total market cap of stable assets currently deployed on the chain'
	},
	{
		name: 'Fees',
		mainRoute: '/fees',
		protocolsRoute: `/fees/chain/{chain}`,
		chainsRoute: '/fees/chains',
		protocolsTracked: metadataCache.totalTrackedByMetric.fees.protocols,
		chainsTracked: metadataCache.totalTrackedByMetric.fees.chains,
		description: 'Total fees paid by users when using the protocol'
	},
	{
		name: 'Revenue',
		mainRoute: '/revenue',
		protocolsRoute: `/revenue/chain/{chain}`,
		chainsRoute: '/revenue/chains',
		protocolsTracked: metadataCache.totalTrackedByMetric.revenue.protocols,
		chainsTracked: metadataCache.totalTrackedByMetric.revenue.chains,
		description:
			"Subset of fees that the protocol collects for itself, usually going to the protocol treasury, the team or distributed among token holders. This doesn't include any fees distributed to Liquidity Providers"
	},
	{
		name: 'Holders Revenue',
		mainRoute: '/holders-revenue',
		protocolsRoute: `/holders-revenue/chain/{chain}`,
		chainsRoute: '/holders-revenue/chains',
		protocolsTracked: metadataCache.totalTrackedByMetric.holdersRevenue.protocols,
		chainsTracked: metadataCache.totalTrackedByMetric.holdersRevenue.chains,
		description:
			'Subset of revenue that is distributed to tokenholders by means of buyback and burn, burning fees or direct distribution to stakers'
	},
	{
		name: 'DEXs',
		mainRoute: '/dexs',
		protocolsRoute: `/dexs/chain/{chain}`,
		chainsRoute: '/dexs/chains',
		protocolsTracked: metadataCache.totalTrackedByMetric.dexs.protocols,
		chainsTracked: metadataCache.totalTrackedByMetric.dexs.chains,
		description: 'Sum of value of all spot token trades that went through the DEX'
	},
	{
		name: 'DEX Aggregators',
		mainRoute: '/dex-aggregators',
		protocolsRoute: `/dex-aggregators/chain/{chain}`,
		chainsRoute: '/dex-aggregators/chains',
		protocolsTracked: metadataCache.totalTrackedByMetric.dexAggregators.protocols,
		chainsTracked: metadataCache.totalTrackedByMetric.dexAggregators.chains,
		description: 'Sum of value of all spot token trades that went through the DEX Aggregators'
	},
	{
		name: 'Perps',
		mainRoute: '/perps',
		protocolsRoute: `/perps/chain/{chain}`,
		chainsRoute: '/perps/chains',
		protocolsTracked: metadataCache.totalTrackedByMetric.perps.protocols,
		chainsTracked: metadataCache.totalTrackedByMetric.perps.chains,
		description: 'Sum of value of all futures trades that went through the Perps protocols'
	},
	{
		name: 'Perps Aggregators',
		mainRoute: '/perps-aggregators',
		protocolsRoute: `/perps-aggregators/chain/{chain}`,
		chainsRoute: '/perps-aggregators/chains',
		protocolsTracked: metadataCache.totalTrackedByMetric.perpAggregators.protocols,
		chainsTracked: metadataCache.totalTrackedByMetric.perpAggregators.chains,
		description: 'Sum of value of all futures trades that went through the Perps Aggregators'
	},
	{
		name: 'Options Premium Volume',
		mainRoute: '/options/premium-volume',
		protocolsRoute: `/options/premium-volume/chain/{chain}`,
		chainsRoute: '/options/premium-volume/chains',
		protocolsTracked: metadataCache.totalTrackedByMetric.options.protocols,
		chainsTracked: metadataCache.totalTrackedByMetric.options.chains,
		description: 'Premium value of all options trades that went through the Options protocols'
	},
	{
		name: 'Options Notional Volume',
		mainRoute: '/options/notional-volume',
		protocolsRoute: `/options/notional-volume/chain/{chain}`,
		chainsRoute: '/options/notional-volume/chains',
		protocolsTracked: metadataCache.totalTrackedByMetric.options.protocols,
		chainsTracked: metadataCache.totalTrackedByMetric.options.chains,
		description: 'Notional value of all options trades that went through the Options protocols'
	},
	{
		name: 'Bridge Aggregators',
		mainRoute: '/bridge-aggregators',
		protocolsRoute: `/bridge-aggregators/chain/{chain}`,
		chainsRoute: '/bridge-aggregators/chains',
		protocolsTracked: metadataCache.totalTrackedByMetric.bridgeAggregators.protocols,
		chainsTracked: metadataCache.totalTrackedByMetric.bridgeAggregators.chains,
		description: 'Sum of value of all assets that were bridged through the Bridge Aggregators'
	}
]
