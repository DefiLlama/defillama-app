import dynamic from 'next/dynamic'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import type { ILineAndBarChartProps } from '~/components/ECharts/types'
import { BasicLink } from '~/components/Link'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { getAdapterChainOverview } from '~/containers/DimensionAdapters/queries'
import Layout from '~/layout'
import { formattedNum, formattedPercent, getNDistinctColors, getPercentChange, slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'
import { ColumnDef } from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { CATEGORY_API, PROTOCOLS_API } from '~/constants'
import { fetchWithErrorLogging } from '~/utils/async'
import { DEFI_SETTINGS_KEYS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { protocolsAndChainsOptions } from '~/components/Filters/options'

const LineAndBarChart = dynamic(() => import('~/components/ECharts/LineAndBarChart'), {
	ssr: false,
	loading: () => <div className="flex items-center justify-center m-auto min-h-[360px]" />
}) as React.FC<ILineAndBarChartProps>

export const getStaticProps = withPerformanceLogging('categories', async () => {
	const [{ protocols }, revenueData, { chart, categories: protocolsByCategory }] = await Promise.all([
		fetchWithErrorLogging(PROTOCOLS_API).then((r) => r.json()),
		getAdapterChainOverview({
			adapterType: 'fees',
			chain: 'All',
			dataType: 'dailyRevenue',
			excludeTotalDataChart: true,
			excludeTotalDataChartBreakdown: true
		}),
		fetchWithErrorLogging(CATEGORY_API).then((r) => r.json())
	])

	const categories = {}
	const tagsByCategory = {}
	const revenueByProtocol = {}
	revenueData.protocols.forEach((p) => {
		revenueByProtocol[p.defillamaId] = p.total24h || 0
	})

	protocols.forEach((p) => {
		const cat = p.category
		if (!categories[cat]) {
			categories[cat] = { name: cat, protocols: 0, tvl: 0, tvlPrevDay: 0, tvlPrevWeek: 0, tvlPrevMonth: 0, revenue: 0 }
		}

		if (p.tags) {
			if (!tagsByCategory[cat]) {
				tagsByCategory[cat] = []
			}

			p.tags.forEach((t) => {
				if (!tagsByCategory[cat][t]) {
					tagsByCategory[cat][t] = {
						name: t,
						protocols: 0,
						tvl: 0,
						tvlPrevDay: 0,
						tvlPrevWeek: 0,
						tvlPrevMonth: 0,
						revenue: 0
					}
				}
				tagsByCategory[cat][t].protocols++
				tagsByCategory[cat][t].tvl += p.tvl ?? 0
				tagsByCategory[cat][t].tvlPrevDay += p.tvlPrevDay ?? 0
				tagsByCategory[cat][t].tvlPrevWeek += p.tvlPrevWeek ?? 0
				tagsByCategory[cat][t].tvlPrevMonth += p.tvlPrevMonth ?? 0
				tagsByCategory[cat][t].revenue += revenueByProtocol[p.defillamaId] ?? 0
			})
		}

		categories[cat].protocols++
		categories[cat].tvl += p.tvl ?? 0
		categories[cat].tvlPrevDay += p.tvlPrevDay ?? 0
		categories[cat].tvlPrevWeek += p.tvlPrevWeek ?? 0
		categories[cat].tvlPrevMonth += p.tvlPrevMonth ?? 0
		categories[cat].revenue += revenueByProtocol[p.defillamaId] ?? 0
	})

	for (const cat in protocolsByCategory) {
		if (!categories[cat]) {
			categories[cat] = { name: cat, protocols: 0, tvl: 0, tvlPrevDay: 0, tvlPrevWeek: 0, tvlPrevMonth: 0, revenue: 0 }
		}
	}

	const finalCategories = []

	for (const cat in categories) {
		const subRows = []
		for (const tag in tagsByCategory[cat]) {
			subRows.push({
				name: tag,
				protocols: tagsByCategory[cat][tag].protocols,
				tvl: tagsByCategory[cat][tag].tvl,
				change_1d: getPercentChange(tagsByCategory[cat][tag].tvl, tagsByCategory[cat][tag].tvlPrevDay),
				change_7d: getPercentChange(tagsByCategory[cat][tag].tvl, tagsByCategory[cat][tag].tvlPrevWeek),
				change_1m: getPercentChange(tagsByCategory[cat][tag].tvl, tagsByCategory[cat][tag].tvlPrevMonth),
				revenue: tagsByCategory[cat][tag].revenue,
				description: descriptions[tag] || ''
			})
		}
		finalCategories.push({
			name: cat,
			protocols: categories[cat].protocols,
			tvl: categories[cat].tvl,
			change_1d: getPercentChange(categories[cat].tvl, categories[cat].tvlPrevDay),
			change_7d: getPercentChange(categories[cat].tvl, categories[cat].tvlPrevWeek),
			change_1m: getPercentChange(categories[cat].tvl, categories[cat].tvlPrevMonth),
			revenue: categories[cat].revenue,
			description: descriptions[cat] || '',
			...(subRows.length > 0 ? { subRows } : {})
		})
	}

	const chartData = {}
	const extraTvlCharts = {}
	const totalCategories = Object.keys(protocolsByCategory).length
	const allColors = getNDistinctColors(totalCategories + 1)
	const categoryColors = Object.fromEntries(Object.keys(protocolsByCategory).map((_, i) => [_, allColors[i]]))

	for (const date in chart) {
		for (const cat in protocolsByCategory) {
			if (!chartData[cat]) {
				chartData[cat] = {
					name: cat,
					data: [],
					type: 'line',
					stack: cat,
					color: categoryColors[cat]
				}
			}
			chartData[cat].data.push([+date * 1e3, chart[date]?.[cat]?.tvl ?? null])
			for (const extra of DEFI_SETTINGS_KEYS) {
				if (!extraTvlCharts[cat]) {
					extraTvlCharts[cat] = {}
				}
				if (!extraTvlCharts[cat][extra]) {
					extraTvlCharts[cat][extra] = {}
				}
				if (!extraTvlCharts[cat][extra][+date * 1e3]) {
					extraTvlCharts[cat][extra][+date * 1e3] = 0
				}
				extraTvlCharts[cat][extra][+date * 1e3] += chart[date]?.[cat]?.[extra] ?? 0
			}
		}
	}

	return {
		props: {
			categories: Object.keys(protocolsByCategory),
			tableData: finalCategories.sort((a, b) => b.tvl - a.tvl),
			chartData,
			extraTvlCharts
		},
		revalidate: maxAgeForNext([22])
	}
})

export const descriptions = {
	Dexs: 'Protocols where you can swap/trade cryptocurrency',
	Yield: 'Protocols that pay you a reward for your staking/LP on their platform',
	Lending: 'Protocols that allow users to borrow and lend assets',
	'Cross Chain Bridge':
		'Protocols that transfer assets between different blockchains through pooled liquidity on each network, instead of relying on mint/burn mechanisms',
	Staking: 'Protocols that allow you to stake assets in exchange of a reward',
	Services: 'Protocols that provide a service to the user',
	'Yield Aggregator': 'Protocols that aggregated yield from diverse protocols',
	Minting: 'Protocols NFT minting Related (in work)',
	Assets: '(will be removed)',
	Derivatives: 'Protocols for betting with leverage',
	Payments: 'Protocols that offer the ability to pay/send/receive cryptocurrency',
	Privacy: 'Protocols that have the intention of hiding information about transactions',
	Insurance: 'Protocols that are designed to provide monetary protections',
	Indexes: 'Protocols that have a way to track/created the performance of a group of related assets',
	Synthetics: 'Protocol that created a tokenized derivative that mimics the value of another asset.',
	CDP: 'Protocols that mint its own stablecoin using collateralized lending',
	Bridge: 'Protocols that bridge tokens from one network to another',
	'Reserve Currency': 'Protocols that use a reserve of valuable assets to back its native token. Includes OHM forks',
	Options: 'Protocols that give you the right to buy an asset at a fixed price',
	Launchpad: 'Protocols that launch new projects and coins',
	Gaming: 'Protocols that have gaming components',
	'Prediction Market': 'Protocols that allow you to wager/bet/buy in future results',
	'Algo-Stables': 'Protocols that provide algorithmic coins to stablecoins',
	'NFT Marketplace': 'Protocols where users can buy/sell/rent NFTs',
	'NFT Lending': 'Protocols that allow you to collateralize your NFT for a loan',
	RWA: 'Protocols that involve Real World Assets, such as house tokenization',
	'RWA Lending':
		'Protocols that bridge traditional finance and blockchain ecosystems by tokenizing real-world assets for use as collateral or credit assessment, enabling decentralized lending and borrowing opportunities.',
	Farm: 'Protocols that allow users to lock money in exchange for a protocol token',
	'Liquid Staking':
		'Protocols that enable you to earn staking rewards on your tokens while also providing a tradeable and liquid receipt for your staked position',
	Oracle: 'Protocols that connect data from the outside world (off-chain) with the blockchain world (on-chain)',
	'Leveraged Farming': 'Protocols that allow you to leverage yield farm with borrowed money',
	'Options Vault': 'Protocols that allow you to deposit collateral into an options strategy',
	'Uncollateralized Lending':
		'Protocol that allows you to lend against known parties that can borrow without collaterall',
	'Exotic Options': 'Protocols that provide option vaults while also adding borrowing on top',
	'Liquidity manager': 'Protocols that manage Liquidity Positions in concentrated liquidity AMMs',
	'Staking Pool': `Refers to platforms where users stake their assets using smart contracts on native blockchains to help secure the network and earn rewards but don't receive a receipt token to use in other Defi apps like with Liquid Staking projects`,
	'Partially Algorithmic Stablecoin': `Coins pegged to USD through decentralized mechanisms, but uses an algorithmic mechanism to keep it stable`,
	SoFi: 'Social Finance Networks',
	'DEX Aggregator': `A platform that sources liquidity from various decentralized exchanges to provide optimal trade execution in terms of price and slippage`,
	Restaking: 'Protocols that allow you to stake the same ETH natively and in others protocols',
	'Liquid Restaking': 'Protocols that create a liquid token for restaking',
	Wallets: 'Protocols where you have a form of digital storage to secure access to your crypto.',
	NftFi: 'NFT leverage protocols',
	'Telegram Bot': 'Trading bots for Telegram users',
	Ponzi: 'Farms promising high rates of return, where the money from new investors is used to pay earlier investors',
	'Basis Trading': `Projects simultaneously buying and selling crypto futures to profit from price differences between the spot and futures markets`,
	MEV: 'MEV Layer',
	CeDeFi: 'Projects that incorporate elements of centralization within their product strategies',
	'CDP Manager': 'Protocols that manage CDPs',
	'Governance Incentives': `Protocols that facilitate governance participation by offering incentives or rewards for token holders' voting power`,
	'Security Extension': 'A browser extension that protects Web3 users from malicious activities and exploits',
	'AI Agents':
		'Smart programs that use AI to handle tasks and make crypto interactions easier for blockchain platforms',
	'Treasury Manager':
		'Protocols that help organizations manage and optimize their treasury assets and funds using automated strategies',
	'OTC Marketplace':
		'A decentralized platform where users can trade assets directly peer-to-peer, using secure smart contracts',
	'Yield Lottery': 'DeFi protocol where users deposit funds for a chance to win the pooled yield as prizes',
	'Token Locker':
		'Protocols that lock digital assets like fungible tokens, NFTs, and LP tokens, ensuring restricted access for a set duration',
	'Bug Bounty': 'Protocols that incentivize security researchers to find and report vulnerabilities in smart contracts',
	'DCA Tools':
		'Protocols that automate dollar-cost averaging, allowing users to make regular crypto investments automatically',
	'Onchain Capital Allocator':
		'Protocols where token pools are actively controlled and managed by a designated operator or governance',
	'Developer Tools':
		'Platforms and services providing APIs, integrations, or other resources to facilitate the development and management of blockchain applications',
	'Stablecoin Issuer':
		'Company that creates and manages stablecoins designed to maintain a stable value, typically pegged to a fiat like the US dollar',
	'Coins Tracker':
		'A tool that aggregates and displays real-time token prices, trading volumes, and market trends from decentralized exchanges',
	Domains: 'Decentralized naming services that map human-readable names to blockchain addresses',
	'NFT Launchpad': 'Platforms that enable creators to mint, manage, and launch NFT collections',
	'Trading App':
		'Apps that simplify trading tokens like memecoins with user-friendly interfaces, real-time updates, self-custodial tools, and direct fiat on-ramps for casual traders',
	Foundation:
		'A foundation supporting blockchain ecosystems by funding research, development, and community initiatives',
	Liquidations: 'Protocols that enable the purchase of liquidated collateral from lending platforms or CDP protocols',
	'Bridge Aggregator':
		'Protocols that consolidate multiple bridging solutions, allowing users to transfer assets across different blockchains by finding the most efficient routes',
	'Restaked BTC':
		'Protocols that enable users to stake their Bitcoin (BTC) natively, receiving a representative receipt token in return',
	'Decentralized BTC':
		'Tokens that represent Bitcoin in a decentralized manner, backed and issued through trustless mechanisms such as smart contracts, without reliance on centralized custodians.',
	'Anchor BTC':
		'Tokens indirectly tied to Bitcoin, backed by assets or instruments that are themselves backed by Bitcoin, offering exposure with additional flexibility but not a direct 1:1 representation of BTC.',
	'Portfolio Tracker': 'Tools that monitor token balances and performance',
	'Liquidity Automation': 'Automatically manages and adjusts liquidity in DeFi protocols through smart contracts',
	'Charity Fundraising': 'Projects that raise capital for DeFi projects through grants, or community contributions',
	'Volume Boosting':
		'Protocols that artificially increase trading volume and liquidity for tokens, boosting market perception',
	DOR: 'Decentralized Offered Rates - The DOR mechanism provides a decentralized benchmark rate for crypto assets',
	'Collateral Management': 'Protocols that manage or leverage onchain collateral for financial applications',
	Meme: 'Tokens inspired by internet culture, trends, or public figures. Typically community-driven and speculative in nature.',
	'Private Investment Platform':
		'Protocols that coordinate private, gated investment opportunities onchain, typically for startups or early-stage projects, often led by curated investor groups',
	'Risk Curators':
		'Projects that analyze DeFi risks and help users choose strategies across lending, trading, or staking systems to improve safety and returns.',
	'DAO Service Provider': 'Protocols that provide services to DAOs',
	'Staking Rental': 'Protocols that facilitate the borrowing or renting of staking rights'
}

const tvlOptions = protocolsAndChainsOptions.filter((e) => e.key !== 'liquidstaking')

export default function Protocols({ categories, tableData, chartData, extraTvlCharts }) {
	const [selectedCategories, setSelectedCategories] = React.useState<Array<string>>(categories)
	const clearAll = () => {
		setSelectedCategories([])
	}
	const toggleAll = () => {
		setSelectedCategories(categories)
	}
	const selectOnlyOne = (category: string) => {
		setSelectedCategories([category])
	}
	const [extaTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	const charts = React.useMemo(() => {
		if (!Object.values(extaTvlsEnabled).some((e) => e === true)) {
			if (selectedCategories.length === categories.length) {
				return chartData
			}

			const charts = {}
			for (const cat in chartData) {
				if (selectedCategories.includes(cat)) {
					charts[cat] = chartData[cat]
				}
			}

			return charts
		}

		const enabledTvls = Object.entries(extaTvlsEnabled)
			.filter((e) => e[1] === true)
			.map((e) => e[0])

		const charts = {}

		for (const cat in chartData) {
			if (selectedCategories.includes(cat)) {
				const data = chartData[cat].data.map(([date, val], index) => {
					const extraTvls = enabledTvls.map((e) => extraTvlCharts?.[cat]?.[e]?.[date] ?? 0)
					return [date, val + extraTvls.reduce((a, b) => a + b, 0)]
				})

				charts[cat] = {
					...chartData[cat],
					data
				}
			}
		}

		return charts
	}, [chartData, selectedCategories, categories, extraTvlCharts, extaTvlsEnabled])

	return (
		<Layout title={`Categories - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch options={tvlOptions} />
			<div className="bg-[var(--cards-bg)] rounded-md">
				<div className="flex gap-2 flex-row items-center flex-wrap justify-end p-3">
					<h1 className="text-xl font-semibold mr-auto">Categories</h1>
					<SelectWithCombobox
						allValues={categories}
						selectedValues={selectedCategories}
						setSelectedValues={setSelectedCategories}
						label="Categories"
						clearAll={clearAll}
						toggleAll={toggleAll}
						selectOnlyOne={selectOnlyOne}
					/>
				</div>
				<div className="bg-[var(--cards-bg)] rounded-md relative">
					<React.Suspense fallback={<></>}>
						<LineAndBarChart charts={charts} valueSymbol="$" solidChartAreaStyle />
					</React.Suspense>
				</div>
			</div>

			<React.Suspense
				fallback={
					<div style={{ minHeight: `${categories.length * 50 + 200}px` }} className="bg-[var(--cards-bg)] rounded-md" />
				}
			>
				<TableWithSearch
					data={tableData}
					columns={categoriesColumn}
					columnToSearch={'name'}
					placeholder={'Search category...'}
				/>
			</React.Suspense>
		</Layout>
	)
}

interface ICategoryRow {
	name: string
	protocols: number
	tvl: number
	description: string
	change_1d: number
	change_7d: number
	change_1m: number
	revenue: number
}

const categoriesColumn: ColumnDef<ICategoryRow>[] = [
	{
		header: 'Category',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span className={`flex items-center gap-2 relative ${row.depth > 0 ? 'pl-8' : 'pl-4'}`}>
					{row.subRows?.length > 0 ? (
						<button
							className="absolute -left-1"
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
							{row.getIsExpanded() ? (
								<>
									<Icon name="chevron-down" height={16} width={16} />
									<span className="sr-only">View child protocols</span>
								</>
							) : (
								<>
									<Icon name="chevron-right" height={16} width={16} />
									<span className="sr-only">Hide child protocols</span>
								</>
							)}
						</button>
					) : null}
					<span className="flex-shrink-0">{index + 1}</span>{' '}
					{row.depth > 0 ? (
						<span className="text-sm font-medium overflow-hidden whitespace-nowrap text-ellipsis">
							{getValue() as string}
						</span>
					) : (
						<BasicLink
							href={`/protocols/${slug(getValue() as string)}`}
							className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
						>
							{getValue() as string}
						</BasicLink>
					)}
				</span>
			)
		},
		size: 240
	},
	{
		header: 'Protocols',
		accessorKey: 'protocols',
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Combined TVL',
		accessorKey: 'tvl',
		accessorFn: (row) => row.tvl ?? undefined,
		cell: ({ getValue }) => {
			const value = getValue() as number | null
			return value != null ? formattedNum(value, true) : null
		},
		meta: {
			align: 'end'
		},
		sortUndefined: 'last',
		size: 135
	},
	{
		header: '1d Change',
		accessorKey: 'change_1d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 110,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 110,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Change',
		accessorKey: 'change_1m',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 110,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Combined 24h Revenue',
		accessorKey: 'revenue',
		accessorFn: (row) => row.revenue ?? undefined,
		cell: ({ getValue }) => {
			const value = getValue() as number | null
			return value != null ? formattedNum(value, true) : null
		},
		meta: {
			align: 'end'
		},
		sortUndefined: 'last',
		size: 200
	},
	{
		header: 'Description',
		accessorKey: 'description',
		enableSorting: false,
		size: 1600
	}
]
