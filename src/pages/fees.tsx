import { useRouter } from 'next/router'
import React from 'react'
import { revalidate } from '~/api'
import { ListOptions } from '~/components/ChainPage/shared'
import { RowLinksWithDropdown } from '~/components/Filters'
import Table, { columnsToShow } from '~/components/Table'
import Layout from '~/layout'

export async function getStaticProps() {
	const feeResults = await fetch("https://fees.llama.fi/fees").then(r=>r.json())

	const feeArray = feeResults.fees
	const fees = feeArray.map(fee => {
		const latestFee = fee.feesHistory.slice(-1)[0]['dailyFees']
		const latestRevenue = fee.revenueHistory.slice(-1)[0]['dailyRevenue']

		const isBreakdown = Object.values(latestFee).find(item => Object.keys(item).find(key => ['v1','v2','v3'].includes(key.toString())))

		if (isBreakdown) {
			const chains: string[] = Object.keys(latestFee)

			let feeBreakdown = { }
			let revenueBreakdown = { }
			chains.forEach(chain => {
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
			const subRows = Object.keys(feeBreakdown).map(version => {
				return {
					...fee,
					version: version.toUpperCase(),
					total1dFees: feeBreakdown[version],
					total1dRevenue: revenueBreakdown[version],
				}
			})
			
			return {
				...fee,
				subRows: subRows
			}
		}
		return fee
	})
	// TODO: Pull from api
	const chainsSet = ['Ethereum','BSC','Arbitrum','Polygon','Avalanche','Optimism','Fantom']
	
	return {
		props: {
			fees,
			chainsSet
		},
		revalidate: revalidate()
	}
}

const columns = columnsToShow(
	'feesProtocol',
	'category',
	'fees',
  	'revenue'
)

const setSelectedChain = (newSelectedChain) => (newSelectedChain === 'All' ? '/fees' : `/fees?chain=${newSelectedChain}`)

export default function Fees(props) {
	let selectedChain = 'All'
	let fees = props.fees
	const router = useRouter()

	if (router.asPath.includes('?chain=')) {
		selectedChain = router.asPath.split("?chain=").slice(-1)[0]
		fees = fees
			.filter(fee => Object.keys(fee.feesHistory.slice(-1)[0]['dailyFees']).includes(selectedChain.toLowerCase()))
			.map(fee => { 
				const total1dFees = Object.values(fee.feesHistory.slice(-1)[0]['dailyFees'][selectedChain.toLowerCase()]).reduce((acc: number, curr: number) => acc + curr, 0)
				const total1dRevenue = Object.values(fee.revenueHistory.slice(-1)[0]['dailyRevenue'][selectedChain.toLowerCase()]).reduce((acc: number, curr: number) => acc + curr, 0)
				return {
					...fee,
					total1dFees,
					total1dRevenue
				}
			})
			.sort((item1, item2) => item2.total1dFees - item1.total1dFees)
	}

	let chainOptions = ['All'].concat(props.chainsSet).map((label) => ({ label, to: setSelectedChain(label) }))

	return (
    	<Layout title={"Fees - DefiLlama"} defaultSEO>
			<ListOptions>
				<RowLinksWithDropdown links={chainOptions} activeLink={selectedChain}/>
			</ListOptions>
			<Table data={fees} columns={columns} />
		</Layout>
	)
}
