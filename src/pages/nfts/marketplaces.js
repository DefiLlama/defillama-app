import { useMemo } from 'react'
import styled from 'styled-components'
import { Box } from 'rebass/styled-components'
import Layout from '~/layout'
import { Header } from '~/Theme'
import SEO from '~/components/SEO'
import { ChainPieChart, ChainDominanceChart } from '~/components/Charts'
import { NftMarketplacesTable } from '~/components/Table'
import { getRandomColor } from '~/utils'
import { addMaxAgeHeaderForNext } from '~/api'
import { getNFTMarketplacesData, getNFTMarketplaceChartData } from '~/api/categories/nfts'

export const getServerSideProps = async ({ params, res }) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
	const marketplaceData = await getNFTMarketplacesData()

	const currentData = marketplaceData.reduce((acc, curr) => {
		const { marketplace: name, totalVolumeUSD: value } = curr
		if (name && value) {
			return (acc = [...acc, { name, value }])
		} else return acc
	}, [])

	const marketplacesUnique = currentData.reduce((acc, curr) => {
		const marketplace = curr.name || null
		if (marketplace) {
			return (acc = [...acc, curr.name])
		}
		return acc
	}, [])

	const chartData = await Promise.all(marketplacesUnique.map((marketplace) => getNFTMarketplaceChartData(marketplace)))

	const daySum = {}
	const stackedDataset = Object.values(
		chartData.reduce((total, marketplace, i) => {
			const marketplaceName = marketplacesUnique[i]
			marketplace.forEach((data) => {
				if (data.timestamp < 1596248105) return
				if (total[data.timestamp] === undefined) {
					total[data.timestamp] = { date: data.timestamp }
				}
				total[data.timestamp][marketplaceName] = data.volumeUSD
				daySum[data.timestamp] = (daySum[data.timestamp] || 0) + data.volumeUSD
			})
			return total
		}, {})
	)

	return {
		props: {
			marketplaceData: marketplaceData || null,
			currentData: currentData || null,
			marketplacesUnique: marketplacesUnique || null,
			stackedDataset: stackedDataset || null,
			daySum: daySum || null
		}
	}
}

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

const MarketplacesView = ({ marketplaceData, currentData, marketplacesUnique, stackedDataset, daySum }) => {
	const marketplaceColor = useMemo(
		() => Object.fromEntries([...marketplacesUnique, 'Other'].map((marketplace) => [marketplace, getRandomColor()])),
		[marketplacesUnique]
	)

	return (
		<>
			<Header>Total Volume All Marketplaces</Header>

			<ChartsWrapper>
				<ChainPieChart data={currentData} chainColor={marketplaceColor} />
				<ChainDominanceChart
					stackOffset="expand"
					formatPercent={true}
					stackedDataset={stackedDataset}
					chainsUnique={marketplacesUnique}
					chainColor={marketplaceColor}
					daySum={daySum}
				/>
			</ChartsWrapper>

			<NftMarketplacesTable data={marketplaceData} />
		</>
	)
}

function Marketplaces(props) {
	return (
		<Layout title="DefiLlama - NFT Dashboard">
			<SEO nftPage />
			<MarketplacesView {...props} />
		</Layout>
	)
}

export default Marketplaces
