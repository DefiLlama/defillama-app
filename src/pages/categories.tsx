import * as React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { Header } from '~/Theme'
import Layout from '~/layout'
import { Panel } from '~/components'
import { ProtocolsChainsSearch } from '~/components/Search'
import { maxAgeForNext } from '~/api'
import { getCategoriesPageData, getProtocolsRaw } from '~/api/categories/protocols'
import { useCalcGroupExtraTvlsByDay } from '~/hooks/data'
import { withPerformanceLogging } from '~/utils/perf'
import type { IChartProps } from '~/components/ECharts/types'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { categoriesColumn } from '~/components/Table/Defi/columns'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

export const getStaticProps = withPerformanceLogging('categories', async () => {
	const protocols = await getProtocolsRaw()
	const chartAndColorsData = await getCategoriesPageData()

	let categories = {}
	protocols.protocols.forEach((p) => {
		const cat = p.category
		if (categories[cat] === undefined) {
			categories[cat] = { protocols: 0, tvl: 0 }
		}
		categories[cat].protocols++
		categories[cat].tvl += p.tvl
	})

	const formattedCategories = Object.entries(categories).map(([name, details]: [string, { tvl: number }]) => ({
		name,
		...details,
		description: descriptions[name] || ''
	}))

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
	'Staking Pool': `Refers to platforms where users stake their assets on native blockchains to help secure the network and earn rewards. Unlike Liquid Staking, users don't receive a token representing their staked assets, and their funds are locked up during the staking period, limiting participation in other DeFi activities`,
	'Decentralized Stablecoin': `Coins pegged to USD through decentralized mechanisms`,
	SoFi: 'Social Finance Networks'
}

export default function Protocols({ categories, chartData, categoryColors, uniqueCategories }) {
	const { chainsWithExtraTvlsByDay: categoriesWithExtraTvlsByDay } = useCalcGroupExtraTvlsByDay(chartData)

	return (
		<Layout title={`Categories - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Categories' }} />

			<Header>Protocol Categories</Header>

			<ChartsWrapper>
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
			</ChartsWrapper>

			<TableWithSearch
				data={categories}
				columns={categoriesColumn}
				columnToSearch={'name'}
				placeholder={'Search category...'}
			/>
		</Layout>
	)
}

const ChartsWrapper = styled(Panel)`
	min-height: 402px;
	display: grid;
	grid-template-columns: 1fr;
	gap: 16px;

	& > * {
		grid-cols: span 1;
	}
`
