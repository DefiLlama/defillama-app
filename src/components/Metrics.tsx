import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import metadataCache from '~/utils/metadata'

export interface ITotalTrackedByMetric {
	tvl: number
	stablecoins: number
	fees: number
	revenue: number
	holdersRevenue: number
	dexs: number
	dexAggregators: number
	perps: number
	perpAggregators: number
	options: number
	bridgeAggregators: number
}

export const Metrics = ({ currentMetric }: { currentMetric: string }) => {
	const router = useRouter()
	const dialogStore = Ariakit.useDialogStore()
	const chain = router.query.chain as string

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<p
				className={`text-center ${
					currentMetric === 'Stablecoins' ? 'my-1' : '-mt-2 mb-1'
				} flex items-center gap-1 justify-center`}
			>
				<span>Metrics by </span>
				<Ariakit.DialogDisclosure className="flex items-center">
					<span className="py-1 px-[10px] border border-dashed border-[var(--old-blue)] bg-[rgba(31,103,210,0.12)] font-semibold rounded-md">
						{currentMetric}
					</span>
					<span className="py-1 px-[10px] flex items-center gap-1 text-[#666] dark:text-[#919296] text-xs">
						<Icon name="pencil" height={12} width={12} />
						<span>Click to change</span>
					</span>
				</Ariakit.DialogDisclosure>
				<Ariakit.Dialog className="dialog gap-3 sm:w-full sm:max-w-[min(85vw,1280px)] max-sm:drawer" unmountOnHide>
					<Ariakit.DialogDismiss
						className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[var(--divider)] text-[var(--text3)] hover:text-[var(--text1)]"
						aria-label="Close modal"
					>
						<Icon name="x" height={20} width={20} />
					</Ariakit.DialogDismiss>
					<Ariakit.DialogHeading className="text-lg font-bold mb-4">Metrics</Ariakit.DialogHeading>
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
						{allMetrics.map((metric) => (
							<BasicLink
								key={`chain-metric-${metric.name}`}
								className="p-[10px] rounded-md bg-[var(--cards-bg)] col-span-1 flex flex-col items-start gap-[2px] hover:bg-[rgba(31,103,210,0.12)] min-h-[120px]"
								href={chain ? `${metric.chainRoute.replace('{chain}', chain)}` : metric.mainRoute}
							>
								<span className="flex items-center gap-2 flex-wrap justify-between w-full">
									<span className="font-medium">{metric.name}</span>
									<span className="text-[var(--link)]">{metric.totalTracked}</span>
								</span>
								<span className="text-[#666] dark:text-[#919296] text-start">{metric.description}</span>
							</BasicLink>
						))}
					</div>
				</Ariakit.Dialog>
			</p>
		</Ariakit.DialogProvider>
	)
}

const allMetrics = [
	{
		name: 'TVL',
		mainRoute: '/',
		chainRoute: `/chain/{chain}`,
		totalTracked: metadataCache.totalTrackedByMetric.tvl,
		description: 'Total value of all coins held in smart contracts of the protocols'
	},
	{
		name: 'Stablecoins',
		mainRoute: '/stablecoins',
		chainRoute: `/stablecoins/{chain}`,
		totalTracked: metadataCache.totalTrackedByMetric.stablecoins,
		description: 'Total market cap of stable assets currently deployed on the chain'
	},
	{
		name: 'Fees',
		mainRoute: '/fees',
		chainRoute: `/fees/chain/{chain}`,
		totalTracked: metadataCache.totalTrackedByMetric.fees,
		description: 'Total fees paid by users when using the protocol'
	},
	{
		name: 'Revenue',
		mainRoute: '/revenue',
		chainRoute: `/revenue/chain/{chain}`,
		totalTracked: metadataCache.totalTrackedByMetric.revenue,
		description:
			"Subset of fees that the protocol collects for itself, usually going to the protocol treasury, the team or distributed among token holders. This doesn't include any fees distributed to Liquidity Providers"
	},
	{
		name: 'Holders Revenue',
		mainRoute: '/holders-revenue',
		chainRoute: `/holders-revenue/chain/{chain}`,
		totalTracked: metadataCache.totalTrackedByMetric.holdersRevenue,
		description:
			'Subset of revenue that is distributed to tokenholders by means of buyback and burn, burning fees or direct distribution to stakers'
	},
	{
		name: 'DEXs',
		mainRoute: '/dexs',
		chainRoute: `/dexs/chain/{chain}`,
		totalTracked: metadataCache.totalTrackedByMetric.dexs,
		description: 'Sum of value of all spot token trades that went through the DEX'
	},
	{
		name: 'DEX Aggregators',
		mainRoute: '/dex-aggregators',
		chainRoute: `/dex-aggregators/chain/{chain}`,
		totalTracked: metadataCache.totalTrackedByMetric.dexAggregators,
		description: 'Sum of value of all spot token trades that went through the DEX Aggregators'
	},
	{
		name: 'Perps',
		mainRoute: '/perps',
		chainRoute: `/perps/chain/{chain}`,
		totalTracked: metadataCache.totalTrackedByMetric.perps,
		description: 'Sum of value of all futures trades that went through the Perps protocols'
	},
	{
		name: 'Perp Aggregators',
		mainRoute: '/perps-aggregators',
		chainRoute: `/perps-aggregators/chain/{chain}`,
		totalTracked: metadataCache.totalTrackedByMetric.perpAggregators,
		description: 'Sum of value of all futures trades that went through the Perp Aggregators'
	},
	{
		name: 'Options Premium Volume',
		mainRoute: '/options/premium-volume',
		chainRoute: `/options/premium-volume/chain/{chain}`,
		totalTracked: metadataCache.totalTrackedByMetric.options,
		description: 'Premium value of all options trades that went through the Options protocols'
	},
	{
		name: 'Options Notional Volume',
		mainRoute: '/options/notional-volume',
		chainRoute: `/options/notional-volume/chain/{chain}`,
		totalTracked: metadataCache.totalTrackedByMetric.options,
		description: 'Notional value of all options trades that went through the Options protocols'
	},
	{
		name: 'Bridge Aggregators',
		mainRoute: '/bridge-aggregators',
		chainRoute: `/bridge-aggregators/chain/{chain}`,
		totalTracked: metadataCache.totalTrackedByMetric.bridgeAggregators,
		description: 'Sum of value of all assets that were bridged through the Bridge Aggregators'
	}
]
