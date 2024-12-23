import dynamic from 'next/dynamic'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { getRevenuesByCategories } from '~/api/categories/fees'
import { getCategoriesPageData, getProtocolsRaw } from '~/api/categories/protocols'
import type { IChartProps } from '~/components/ECharts/types'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { categoriesColumn } from '~/components/Table/Defi/columns'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { useCalcGroupExtraTvlsByDay } from '~/hooks/data'
import Layout from '~/layout'
import { getPercentChange } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

export const getStaticProps = withPerformanceLogging('categories', async () => {
	const protocols = await getProtocolsRaw()
	const aggregatedRevenuesByCat = await getRevenuesByCategories()
	const chartAndColorsData = await getCategoriesPageData()

	let categories = {}

	protocols.protocols.forEach((p) => {
		const cat = p.category
		if (!categories[cat]) {
			categories[cat] = { protocols: 0, tvl: 0, tvlPrevDay: 0, tvlPrevWeek: 0, tvlPrevMonth: 0, revenue: 0 }
		}
		categories[cat].protocols++
		categories[cat].tvl += p.tvl
		categories[cat].tvlPrevDay += p.tvlPrevDay ?? 0
		categories[cat].tvlPrevWeek += p.tvlPrevWeek ?? 0
		categories[cat].tvlPrevMonth += p.tvlPrevMonth ?? 0
	})

	Object.entries(aggregatedRevenuesByCat).forEach(([category, revenue]) => {
		if (!categories[category]) {
			categories[category] = { protocols: 0, tvl: 0, revenue: 0 }
		}
		categories[category].revenue = revenue
	})

	const allCategories = new Set([...Object.keys(categories), ...Object.keys(aggregatedRevenuesByCat)])

	allCategories.forEach((cat) => {
		if (!categories[cat]) {
			categories[cat] = { protocols: 0, tvl: 0, tvlPrevDay: 0, tvlPrevWeek: 0, tvlPrevMonth: 0, revenue: 0 }
		}
	})

	const formattedCategories = Object.entries(categories).map(
		([name, details]: [
			string,
			{ tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number; revenue: number; protocols: number }
		]) => ({
			name,
			protocols: details.protocols > 0 ? details.protocols : '',
			tvl: details.tvl,
			change_1d: getPercentChange(details.tvl, details.tvlPrevDay),
			change_7d: getPercentChange(details.tvl, details.tvlPrevWeek),
			change_1m: getPercentChange(details.tvl, details.tvlPrevMonth),
			revenue: details.revenue,
			description: descriptions[name] || ''
		})
	)

	return {
		props: {
			categories: formattedCategories.sort((a, b) => b.tvl - a.tvl),
			...chartAndColorsData
		},
		revalidate: maxAgeForNext([22])
	}
})

export const descriptions = {
	Dexes: 'Protocols where you can swap/trade cryptocurrency',
	Yield: 'Protocols that pay you a reward for your staking/LP on their platform',
	Lending: 'Protocols that allow users to borrow and lend assets',
	'Cross Chain': 'Protocols that add interoperability between different blockchains',
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
	'Reserve Currency':
		'OHM forks: Protocols that uses a reserve of valuable assets acquired through bonding and staking to issue and back its native token',
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
	'Decentralized Stablecoin': `Coins pegged to USD through decentralized mechanisms`,
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
	'Managed Token Pools':
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
		'Protocols that consolidate multiple bridging solutions, allowing users to transfer assets across different blockchains by finding the most efficient routes'
}

export default function Protocols({ categories, chartData, categoryColors, uniqueCategories }) {
	const { chainsWithExtraTvlsByDay: categoriesWithExtraTvlsByDay } = useCalcGroupExtraTvlsByDay(chartData)

	return (
		<Layout title={`Categories - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch />

			<h1 className="text-2xl font-medium -mb-5">Protocol Categories</h1>

			<div className="bg-[var(--bg6)] min-h-[424px] shadow rounded-xl p-4">
				<AreaChart
					chartData={categoriesWithExtraTvlsByDay}
					stacks={uniqueCategories}
					stackColors={categoryColors}
					customLegendName="Category"
					customLegendOptions={uniqueCategories}
					hideDefaultLegend
					valueSymbol="$"
					title=""
				/>
			</div>

			<TableWithSearch
				data={categories}
				columns={categoriesColumn}
				columnToSearch={'name'}
				placeholder={'Search category...'}
			/>
		</Layout>
	)
}
