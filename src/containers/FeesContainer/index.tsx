import { revalidate } from '~/api'
import React from 'react'
import { ListOptions } from '~/components/ChainPage/shared'
import { RowLinksWithDropdown } from '~/components/Filters'
import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search'
import { FeesTable } from '~/components/Table'

/* TODO: Pull from api
fees.reduce((all, curr)=>{
    (curr.chains ?? []).map(chain=>all.add(chain));
    return all
}, new Set())
*/
export const feesChainsSet = [
	'Ethereum',
	'BSC',
	'Arbitrum',
	'Polygon',
	'Avalanche',
	'Optimism',
	'Fantom',
	'Solana',
	'Cosmos'
]

export async function feesStaticProps(selectedChain) {
	const feeResults = await fetch('https://fees.llama.fi/fees').then((r) => r.json())

	const feeArray = feeResults.fees
	let fees = feeArray.map((fee) => {
		const latestFee = fee.feesHistory.slice(-1)[0]['dailyFees']
		const latestRevenue = fee.revenueHistory.slice(-1)[0]['dailyRevenue']

		const isBreakdown = Object.values(latestFee).find((item) =>
			Object.keys(item).find((key) => ['v1', 'v2', 'v3'].includes(key.toString()))
		)

		if (isBreakdown) {
			const chains: string[] = Object.keys(latestFee)

			let feeBreakdown = {}
			let revenueBreakdown = {}
			chains.forEach((chain) => {
				for (const [version, value] of Object.entries(latestFee[chain])) {
					if (!feeBreakdown[version]) {
						feeBreakdown[version] = value as number
					} else {
						feeBreakdown[version] += value as number
					}
				}
				for (const [version, value] of Object.entries(latestRevenue[chain])) {
					if (!revenueBreakdown[version]) {
						revenueBreakdown[version] = value as number
					} else {
						revenueBreakdown[version] += value as number
					}
				}
			})

			const subRows = Object.keys(feeBreakdown).map((version) => {
				return {
					...fee,
					subRows: [],
					version: version.toUpperCase(),
					total1dFees: feeBreakdown[version],
					total1dRevenue: revenueBreakdown[version]
				}
			})

			return {
				...fee,
				subRows: subRows
			}
		}
		return fee
	})

	if (selectedChain !== 'All') {
		selectedChain = selectedChain.toLowerCase() === 'avalanche' ? 'avax' : selectedChain

		fees = fees
			.filter((fee) => Object.keys(fee.feesHistory.slice(-1)[0]['dailyFees']).includes(selectedChain.toLowerCase()))
			.map((fee) => {
				const latestFee = fee.feesHistory.slice(-1)[0]['dailyFees'][selectedChain.toLowerCase()]
				const latestRevenue = fee.revenueHistory.slice(-1)[0]['dailyRevenue'][selectedChain.toLowerCase()]

				const total1dFees = Object.values(latestFee).reduce((acc: number, curr: number) => acc + curr, 0)
				const total1dRevenue = Object.values(latestRevenue).reduce((acc: number, curr: number) => acc + curr, 0)

				const isBreakdown = Object.keys(latestFee).find((key) => ['v1', 'v2', 'v3'].includes(key.toString()))

				if (isBreakdown) {
					let feeBreakdown = {}
					let revenueBreakdown = {}
					for (const [version, value] of Object.entries(latestFee)) {
						if (!feeBreakdown[version]) {
							feeBreakdown[version] = value as number
						} else {
							feeBreakdown[version] += value as number
						}
					}
					for (const [version, value] of Object.entries(latestRevenue)) {
						if (!revenueBreakdown[version]) {
							revenueBreakdown[version] = value as number
						} else {
							revenueBreakdown[version] += value as number
						}
					}

					const subRows = Object.keys(feeBreakdown).map((version) => {
						return {
							...fee,
							subRows: [],
							version: version.toUpperCase(),
							total1dFees: feeBreakdown[version],
							total1dRevenue: revenueBreakdown[version]
						}
					})

					return {
						...fee,
						total1dFees,
						total1dRevenue,
						subRows: subRows
					}
				}

				return {
					...fee,
					total1dFees,
					total1dRevenue
				}
			})
			.sort((item1, item2) => item2.total1dFees - item1.total1dFees)
	}

	return {
		props: {
			fees,
			selectedChain
		},
		revalidate: revalidate()
	}
}

const setSelectedChain = (newSelectedChain) =>
	newSelectedChain === 'All' ? '/fees' : `/fees/chain/${newSelectedChain}`

export default function FeesContainer(props) {
	let chainOptions = ['All'].concat(feesChainsSet).map((label) => ({ label, to: setSelectedChain(label) }))

	return (
		<Layout title={'Fees - DefiLlama'} defaultSEO>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Fees', hideOptions: true }} />

			<ListOptions>
				<RowLinksWithDropdown
					links={chainOptions}
					activeLink={props.selectedChain === 'avax' ? 'Avalanche' : props.selectedChain}
				/>
			</ListOptions>

			<FeesTable data={props.fees} />
		</Layout>
	)
}
