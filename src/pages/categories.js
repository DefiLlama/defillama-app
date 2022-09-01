import styled from 'styled-components'
import { Header } from '~/Theme'
import Layout from '~/layout'
import { CustomLink } from '~/components/Link'
import Table, { Index } from '~/components/Table'
import { ProtocolsChainsSearch } from '~/components/Search'
import { toK } from '~/utils'
import { revalidate } from '~/api'
import { getProtocolsRaw } from '~/api/categories/protocols'

export async function getStaticProps() {
	const protocols = await getProtocolsRaw()

	let categories = {}
	protocols.protocols.forEach((p) => {
		const cat = p.category
		if (categories[cat] === undefined) {
			categories[cat] = { protocols: 0, tvl: 0 }
		}
		categories[cat].protocols++
		categories[cat].tvl += p.tvl
	})

	categories = Object.entries(categories).map(([name, details]) => ({
		name,
		...details,
		description: descriptions[name] || ''
	}))

	return {
		props: {
			categories: categories.sort((a, b) => b.tvl - a.tvl)
		},
		revalidate: revalidate()
	}
}

const descriptions = {
	Dexes: 'Protocols where you can swap/trade cryptocurrency',
	Yield: 'Protocols that pay you a reward for your staking/LP on their platform',
	Lending: 'Protocols that allow users to borrow and lend assets',
	'Cross Chain': 'Protocols that add interoperability between different blockchains',
	Staking: 'Protocols that allow you to stake assets in exchange of a reward',
	Services: 'Protocols that provide a service to the user',
	'Yield Aggregator': 'Protocols that aggregated yield from diverse protocols',
	Minting: 'NFT Related (in work)',
	Assets: '(will be removed)',
	Derivatives: 'Smart contracts that gets its value, risk, and basic term structure from an underlying asset',
	Payments: 'Offer the ability to pay/send/receive cryptocurrency',
	Privacy: 'Protocols that have the intention of hiding information about transactions',
	Insurance: 'Protocols that are designed to provide monetary protections',
	Indexes: 'Protocols that have a way to track/created the performance of a group of related assets',
	Synthetics: 'Protocol that created a tokenized derivative that mimics the value of another asset.',
	CDP: 'Protocols that mint its own stablecoin using some collateral',
	Bridge: 'Protocols that bridge token from one network to another',
	'Reserve Currency':
		'Ohm fork: A protocol that uses a reserve of valuable assets acquired through bonding and staking to issue and back its native token',
	Options: 'Protocols that give you the right to buy an asset at a fixed price',
	Launchpad: 'Protocols that launch new projects and coins',
	Gaming: 'Protocols that have gaming components',
	'Prediction Market': 'Protocols that allow you to wager/bet/buy in future results',
	'Algo-Stables': 'From algorithmic coins to stablecoins',
	'NFT Marketplace': 'Protocols where users can buy/sell/rent NFTs',
	'NFT Lending': 'Protocols that allow you too collateralize your NFT for a loan',
	'RWA': 'Protocols that involve Real World Assets, such as house tokenization',
	Farm: 'Lock money in exchange for their token',
	'Liquid Staking': 'Rewards/Liquidity for staked assets',
	Oracle: 'Protocols that connect data from the outside world (off-chain) with the blockchain world (on-chain)'
}

const columns = [
	{
		header: 'Category',
		accessor: 'name',
		disableSortBy: true,
		Cell: ({ value, rowIndex }) => {
			return (
				<Index>
					<span>{rowIndex + 1}</span>
					<CustomLink href={`/protocols/${value}`}>{value}</CustomLink>
				</Index>
			)
		}
	},
	{
		header: 'Protocols',
		accessor: 'protocols'
	},
	{
		header: 'Combined TVL',
		accessor: 'tvl',
		Cell: ({ value }) => {
			return <span>{'$' + toK(value)}</span>
		}
	},
	{
		header: 'Description',
		accessor: 'description',
		disableSortBy: true
	}
]

const TableWrapper = styled(Table)`
	tr > *:last-child {
		text-align: start;
	}
`

export default function Protocols({ categories }) {
	return (
		<Layout title={`Categories - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Categories' }} />

			<Header>Protocol Categories</Header>

			<TableWrapper data={categories} columns={columns} align="start" gap="40px" />
		</Layout>
	)
}
