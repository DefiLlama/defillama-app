import * as React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { maxAgeForNext } from '~/api'
import type { ILineAndBarChartProps } from '~/components/ECharts/types'
import { tvlOptions } from '~/components/Filters/options'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { CATEGORY_API, PROTOCOLS_API } from '~/constants'
import { getAdapterChainOverview } from '~/containers/DimensionAdapters/queries'
import { DEFI_SETTINGS_KEYS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import Layout from '~/layout'
import { formattedNum, formattedPercent, getNDistinctColors, getPercentChange, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

const LineAndBarChart = React.lazy(
	() => import('~/components/ECharts/LineAndBarChart')
) as React.FC<ILineAndBarChartProps>

export const getStaticProps = withPerformanceLogging('categories', async () => {
	const [{ protocols }, revenueData, { chart, categories: protocolsByCategory }] = await Promise.all([
		fetchJson(PROTOCOLS_API),
		getAdapterChainOverview({
			adapterType: 'fees',
			chain: 'All',
			dataType: 'dailyRevenue',
			excludeTotalDataChart: true,
			excludeTotalDataChartBreakdown: true
		}),
		fetchJson(CATEGORY_API)
	])

	const categories = {}
	const tagsByCategory = {}
	const revenueByProtocol = {}
	revenueData.protocols.forEach((p) => {
		revenueByProtocol[p.defillamaId] = p.total24h || 0
	})

	protocols.forEach((p) => {
		const cat = p.category

		const tvl = p.tvl ?? 0
		const tvlPrevDay = p.tvlPrevDay ?? 0
		const tvlPrevWeek = p.tvlPrevWeek ?? 0
		const tvlPrevMonth = p.tvlPrevMonth ?? 0

		const extraTvls = {}

		for (const extra of DEFI_SETTINGS_KEYS) {
			if (!['doublecounted', 'liquidstaking'].includes(extra) && p.chainTvls[extra]) {
				extraTvls[extra] = p.chainTvls[extra]
			}
		}

		if (!categories[cat]) {
			categories[cat] = {
				name: cat,
				protocols: 0,
				tvl: 0,
				tvlPrevDay: 0,
				tvlPrevWeek: 0,
				tvlPrevMonth: 0,
				revenue: 0,
				extraTvls: Object.fromEntries(
					DEFI_SETTINGS_KEYS.map((key) => [key, { tvl: 0, tvlPrevDay: 0, tvlPrevWeek: 0, tvlPrevMonth: 0 }])
				)
			}
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
						revenue: 0,
						extraTvls: Object.fromEntries(
							DEFI_SETTINGS_KEYS.map((key) => [key, { tvl: 0, tvlPrevDay: 0, tvlPrevWeek: 0, tvlPrevMonth: 0 }])
						)
					}
				}
				tagsByCategory[cat][t].protocols++
				tagsByCategory[cat][t].tvl += tvl
				tagsByCategory[cat][t].tvlPrevDay += tvlPrevDay
				tagsByCategory[cat][t].tvlPrevWeek += tvlPrevWeek
				tagsByCategory[cat][t].tvlPrevMonth += tvlPrevMonth
				tagsByCategory[cat][t].revenue += revenueByProtocol[p.defillamaId] ?? 0

				for (const extra in extraTvls) {
					tagsByCategory[cat][t].extraTvls[extra].tvl += extraTvls[extra].tvl
					tagsByCategory[cat][t].extraTvls[extra].tvlPrevDay += extraTvls[extra].tvlPrevDay
					tagsByCategory[cat][t].extraTvls[extra].tvlPrevWeek += extraTvls[extra].tvlPrevWeek
					tagsByCategory[cat][t].extraTvls[extra].tvlPrevMonth += extraTvls[extra].tvlPrevMonth
				}
			})
		}

		categories[cat].protocols++
		categories[cat].tvl += tvl
		categories[cat].tvlPrevDay += tvlPrevDay
		categories[cat].tvlPrevWeek += tvlPrevWeek
		categories[cat].tvlPrevMonth += tvlPrevMonth
		categories[cat].revenue += revenueByProtocol[p.defillamaId] ?? 0

		for (const extra in extraTvls) {
			categories[cat].extraTvls[extra].tvl += extraTvls[extra].tvl
			categories[cat].extraTvls[extra].tvlPrevDay += extraTvls[extra].tvlPrevDay
			categories[cat].extraTvls[extra].tvlPrevWeek += extraTvls[extra].tvlPrevWeek
			categories[cat].extraTvls[extra].tvlPrevMonth += extraTvls[extra].tvlPrevMonth
		}
	})

	for (const cat in protocolsByCategory) {
		if (!categories[cat]) {
			categories[cat] = { name: cat, protocols: 0, tvl: 0, tvlPrevDay: 0, tvlPrevWeek: 0, tvlPrevMonth: 0, revenue: 0 }
		}
	}

	const finalCategories = []

	for (const cat in protocolsByCategory) {
		const subRows = []
		for (const tag in tagsByCategory[cat]) {
			subRows.push({
				...tagsByCategory[cat][tag],
				change_1d: getPercentChange(tagsByCategory[cat][tag].tvl, tagsByCategory[cat][tag].tvlPrevDay),
				change_7d: getPercentChange(tagsByCategory[cat][tag].tvl, tagsByCategory[cat][tag].tvlPrevWeek),
				change_1m: getPercentChange(tagsByCategory[cat][tag].tvl, tagsByCategory[cat][tag].tvlPrevMonth),
				description: descriptions[tag] || ''
			})
		}
		finalCategories.push({
			...categories[cat],
			change_1d: getPercentChange(categories[cat].tvl, categories[cat].tvlPrevDay),
			change_7d: getPercentChange(categories[cat].tvl, categories[cat].tvlPrevWeek),
			change_1m: getPercentChange(categories[cat].tvl, categories[cat].tvlPrevMonth),
			description: descriptions[cat] || '',
			...(subRows.length > 0 ? { subRows } : {})
		})
	}

	const chartData = {}
	const extraTvlCharts = {}
	const totalCategories = Object.keys(protocolsByCategory).length
	const allColors = getNDistinctColors(totalCategories)
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
				if (['doublecounted', 'liquidstaking'].includes(extra)) {
					continue
				}

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
	'Staking Rental': 'Protocols that facilitate the borrowing or renting of staking rights',
	'Canonical Bridge': 'The official bridge designated by a blockchain for transferring its assets across networks',
	Interface: 'Projects that provide a user interface to interact with external protocols',
	'Video Infrastructure':
		'Protocols that provide decentralized tools and infrastructure for video streaming, transcoding, recording, playback, or media processing',
	DePIN:
		'Protocols that provide decentralized infrastructure for physical assets, such as sensors, devices, or networks, enabling real-world data collection and processing via onchain rewards and governance',
	'Dual-Token Stablecoin':
		'Protocols that maintain a USD peg through a dual-token system where one token serves as the stablecoin and the other absorbs volatility, using overcollateralized reserves and algorithmic mechanisms to adjust supply and maintain stability',
	'Physical TCG': 'Protocols that allow you to trade physical trading cards',
	'Mining Pools': 'Protocols that coordinate user resources into shared mining pools',
	'NFT Automated Strategies': 'Protocols that deploy automated trading and capital allocation strategies around NFTs, such as floor buying, relisting, and supply-burn loops',
}

const finalTvlOptions = tvlOptions.filter((e) => !['liquidstaking', 'doublecounted'].includes(e.key))

const pageName = ['Protocol Categories']

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

	const finalCategoriesList = React.useMemo(() => {
		const enabledTvls = Object.entries(extaTvlsEnabled)
			.filter((e) => e[1] === true)
			.map((e) => e[0])

		if (enabledTvls.length === 0) {
			return tableData
		}

		const finalList = []

		for (const cat of tableData) {
			const subRows = []
			for (const subRow of cat.subRows ?? []) {
				let tvl = subRow.tvl
				let tvlPrevDay = subRow.tvlPrevDay
				let tvlPrevWeek = subRow.tvlPrevWeek
				let tvlPrevMonth = subRow.tvlPrevMonth

				for (const extra of enabledTvls) {
					if (subRow.extraTvls[extra]) {
						tvl += subRow.extraTvls[extra].tvl
						tvlPrevDay += subRow.extraTvls[extra].tvlPrevDay
						tvlPrevWeek += subRow.extraTvls[extra].tvlPrevWeek
						tvlPrevMonth += subRow.extraTvls[extra].tvlPrevMonth
					}
				}

				subRows.push({
					...subRow,
					tvl,
					tvlPrevDay,
					tvlPrevWeek,
					tvlPrevMonth,
					change_1d: getPercentChange(tvl, tvlPrevDay),
					change_7d: getPercentChange(tvl, tvlPrevWeek),
					change_1m: getPercentChange(tvl, tvlPrevMonth)
				})
			}

			let tvl = cat.tvl
			let tvlPrevDay = cat.tvlPrevDay
			let tvlPrevWeek = cat.tvlPrevWeek
			let tvlPrevMonth = cat.tvlPrevMonth

			for (const extra of enabledTvls) {
				if (cat.extraTvls[extra]) {
					tvl += cat.extraTvls[extra].tvl
					tvlPrevDay += cat.extraTvls[extra].tvlPrevDay
					tvlPrevWeek += cat.extraTvls[extra].tvlPrevWeek
					tvlPrevMonth += cat.extraTvls[extra].tvlPrevMonth
				}
			}

			finalList.push({
				...cat,
				tvl,
				tvlPrevDay,
				tvlPrevWeek,
				tvlPrevMonth,
				change_1d: getPercentChange(tvl, tvlPrevDay),
				change_7d: getPercentChange(tvl, tvlPrevWeek),
				change_1m: getPercentChange(tvl, tvlPrevMonth),
				...(subRows.length > 0 ? { subRows } : {})
			})
		}

		return finalList
	}, [tableData, extaTvlsEnabled])

	return (
		<Layout
			title={`Categories - DefiLlama`}
			description={`Combined TVL, Revenue and other metrics by category of all protocols that are tracked by DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`protocols categories, defi categories`}
			canonicalUrl={`/categories`}
			metricFilters={finalTvlOptions}
			pageName={pageName}
		>
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-row flex-wrap items-center justify-end gap-2 p-3">
					<h1 className="mr-auto text-xl font-semibold">Categories</h1>
					<SelectWithCombobox
						allValues={categories}
						selectedValues={selectedCategories}
						setSelectedValues={setSelectedCategories}
						label="Categories"
						clearAll={clearAll}
						toggleAll={toggleAll}
						selectOnlyOne={selectOnlyOne}
						labelType="smol"
					/>
				</div>

				<React.Suspense fallback={<div className="m-auto flex min-h-[360px] items-center justify-center" />}>
					<LineAndBarChart charts={charts} valueSymbol="$" solidChartAreaStyle />
				</React.Suspense>
			</div>

			<React.Suspense
				fallback={
					<div
						style={{ minHeight: `${categories.length * 50 + 200}px` }}
						className="rounded-md border border-(--cards-border) bg-(--cards-bg)"
					/>
				}
			>
				<TableWithSearch
					data={finalCategoriesList}
					columns={categoriesColumn}
					columnToSearch={'name'}
					placeholder={'Search category...'}
					sortingState={[{ id: 'tvl', desc: true }]}
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
				<span className={`relative flex items-center gap-2 ${row.depth > 0 ? 'pl-8' : 'pl-4'}`}>
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
					<span className="shrink-0">{index + 1}</span>{' '}
					{row.depth > 0 ? (
						<BasicLink
							href={`/protocols/${slug(getValue() as string)}`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{getValue() as string}
						</BasicLink>
					) : (
						<BasicLink
							href={`/protocols/${slug(getValue() as string)}`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
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
		header: '1d TVL Change',
		accessorKey: 'change_1d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d TVL Change',
		accessorKey: 'change_7d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m TVL Change',
		accessorKey: 'change_1m',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
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
