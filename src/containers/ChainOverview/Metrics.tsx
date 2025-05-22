import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
// import { getColumnsToShowByCategory, TABLE_CATEGORIES, tableColumnOptionsKey } from './constants'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'

export const ChainOverviewMetrics = ({ currentMetric }: { currentMetric: string }) => {
	const router = useRouter()
	const dialogStore = Ariakit.useDialogStore()
	const chain = router.query.chain as string

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<p className="text-center my-1 flex items-center gap-1 justify-center">
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
				<Ariakit.Dialog className="dialog gap-3 sm:w-full sm:max-w-[70vw] max-sm:drawer" unmountOnHide>
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
								className="p-[10px] rounded-md bg-[var(--cards-bg)] col-span-1 flex flex-col items-start gap-[2px]"
								href={chain ? `${metric.chainRoute.replace('{chain}', chain)}` : metric.mainRoute}
							>
								<span className="font-medium">{metric.name}</span>
								<span className="text-[var(--link)]">Protocols:</span>
								<span className="text-[#666] dark:text-[#919296] text-start">
									Comparison of DeFi activity and metrics across different blockchain networks
								</span>
							</BasicLink>
						))}
						{/* {allMetrics.map((metric) => (
							<button
								key={`chain-metric-${metric.name}`}
								onClick={() => {
									localStorage.setItem(
										tableColumnOptionsKey,
										JSON.stringify(getColumnsToShowByCategory(metric.columnsCategory))
									)

									router
										.push(
											{
												query: {
													...(router.query.chain ? { chain: router.query.chain } : {}),
													tvl: false,
													...metric.charts.reduce((acc, chart) => {
														acc[chart] = true
														return acc
													}, {})
												}
											},
											undefined,
											{ shallow: true }
										)
										.then(() => {
											dialogStore.hide()
										})
								}}
								className="p-[10px] rounded-md bg-[var(--cards-bg)] col-span-1 flex flex-col items-start gap-[2px]"
							>
								<span className="font-medium">{metric.name}</span>
								<span className="text-[var(--link)]">Protocols:</span>
								<span className="text-[#666] dark:text-[#919296] text-start">
									Comparison of DeFi activity and metrics across different blockchain networks
								</span>
							</button>
						))} */}
					</div>
				</Ariakit.Dialog>
			</p>
		</Ariakit.DialogProvider>
	)
}

const allMetrics = [
	{ name: 'TVL', mainRoute: '/', chainRoute: `/chain/{chain}` },
	{ name: 'Fees', mainRoute: '/fees', chainRoute: `/fees/chains/{chain}` },
	{ name: 'DEXs', mainRoute: '/dexs', chainRoute: `/dexs/chains/{chain}` },
	{ name: 'Stablecoins', mainRoute: '/stablecoins', chainRoute: `/stablecoins/{chain}` }
]

// const allMetrics = [
// 	{ name: 'Total Value Locked', charts: ['tvl'], columnsCategory: TABLE_CATEGORIES.TVL },
// 	{
// 		name: 'Fees',
// 		charts: ['chainFees'],
// 		columnsCategory: TABLE_CATEGORIES.FEES
// 	},
// 	{
// 		name: 'Revenue',
// 		charts: ['chainRevenue'],
// 		columnsCategory: TABLE_CATEGORIES.REVENUE
// 	},
// 	{
// 		name: 'DEXs',
// 		charts: ['dexs'],
// 		columnsCategory: TABLE_CATEGORIES.VOLUME
// 	},
// 	{ name: 'Stablecoins', charts: ['stables'], columnsCategory: TABLE_CATEGORIES.TVL }
// ]
