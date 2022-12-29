import { useMemo } from 'react'
import styled from 'styled-components'
import { Box } from 'rebass/styled-components'
import { Header } from '~/Theme'
import Layout from '~/layout'
import SEO from '~/components/SEO'
import { ChainPieChart, ChainDominanceChart } from '~/components/Charts'
import { NftChainsTable } from '~/components/Table'
import { getRandomColor } from '~/utils'
import { maxAgeForNext } from '~/api'
import { getNFTChainChartData, getNFTChainsData } from '~/api/categories/nfts'

// export async function getStaticProps() {
// 	const chainData = await getNFTChainsData()

// 	const currentData = chainData.reduce((acc, curr) => {
// 		const { chain: name, totalVolumeUSD: value } = curr
// 		if (name && value) {
// 			return (acc = [...acc, { name, value }])
// 		} else return acc
// 	}, [])

// 	const chainsUnique = chainData.reduce((acc, curr) => {
// 		const chain = curr.chain || null
// 		if (chain) {
// 			return (acc = [...acc, curr.chain])
// 		}
// 		return acc
// 	}, [])

// 	const chartData = await Promise.all(chainsUnique.map((chain) => getNFTChainChartData(chain)))

// 	const daySum = {}
// 	const stackedDataset = Object.values(
// 		chartData.reduce((total, chain, i) => {
// 			const chainName = chainsUnique[i]
// 			chain.forEach((dayTvl) => {
// 				if (dayTvl.timestamp < 1596248105) return
// 				if (total[dayTvl.timestamp] === undefined) {
// 					total[dayTvl.timestamp] = { date: dayTvl.timestamp }
// 				}
// 				total[dayTvl.timestamp][chainName] = dayTvl.volumeUSD
// 				daySum[dayTvl.timestamp] = (daySum[dayTvl.timestamp] || 0) + dayTvl.volumeUSD
// 			})
// 			return total
// 		}, {})
// 	)

// 	return {
// 		props: {
// 			chainData: chainData || null,
// 			currentData: currentData || null,
// 			chainsUnique: chainsUnique || null,
// 			stackedDataset: stackedDataset || null,
// 			daySum: daySum || null
// 		},
// 		revalidate: maxAgeForNext([22])
// 	}
// }

const ChartsWrapper = styled(Box)`
	display: flex;
	flex-wrap: nowrap;
	width: 100%;
	padding: 0;
	align-items: center;
	@media (max-width: 800px) {
		display: grid;
		grid-auto-rows: auto;
	}
`

const ChainsView = ({ chainData, currentData, chainsUnique, stackedDataset, daySum }) => {
	// return <div />

	const chainColor = useMemo(
		() => Object.fromEntries([...chainsUnique, 'Other'].map((chain) => [chain, getRandomColor()])),
		[chainsUnique]
	)

	return (
		<>
			<Header>Total Volume All Chains</Header>

			<ChartsWrapper>
				<ChainPieChart data={currentData} chainColor={chainColor} />
				<ChainDominanceChart
					stackOffset="expand"
					formatPercent={true}
					stackedDataset={stackedDataset}
					chainsUnique={chainsUnique}
					chainColor={chainColor}
					daySum={daySum}
				/>
			</ChartsWrapper>

			<NftChainsTable data={chainData} />
		</>
	)
}

function Chains(props) {
	return (
		<Layout title="DefiLlama - NFT Dashboard">
			<SEO nftPage />
			<ChainsView {...props} />
		</Layout>
	)
}

export default Chains
