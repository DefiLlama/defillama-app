import { useMemo } from 'react'
import styled from 'styled-components'
import { Box } from 'rebass'
import { Header } from '~/Theme'
import Layout from '~/layout'
import { ForksTable } from '~/components/VirtualTable'
import { ProtocolsChainsSearch } from '~/components/Search'
import { ChainDominanceChart, ChainPieChart } from '~/components/Charts'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { useCalcGroupExtraTvlsByDay, useCalcStakePool2Tvl } from '~/hooks/data'
import { getRandomColor } from '~/utils'
import { revalidate } from '~/api'
import { getForkPageData } from '~/api/categories/protocols'

export async function getStaticProps() {
	const data = await getForkPageData()

	return {
		...data,
		revalidate: revalidate()
	}
}

const ChartsWrapper = styled(Box)`
	display: flex;
	flex-wrap: nowrap;
	width: 100%;
	padding: 0;
	align-items: center;
	z-index: 1;
	@media (max-width: 800px) {
		display: grid;
		grid-auto-rows: auto;
	}
`

const PageView = ({ chartData, tokensProtocols, tokens, tokenLinks, parentTokens }) => {
	const tokenColors = useMemo(
		() => Object.fromEntries([...tokens, 'Others'].map((token) => [token, getRandomColor()])),
		[tokens]
	)

	const forkedTokensData = useCalcStakePool2Tvl(parentTokens)

	const { data: stackedData, daySum } = useCalcGroupExtraTvlsByDay(chartData)

	const { tokenTvls, tokensList } = useMemo(() => {
		const tvls = Object.entries(stackedData[stackedData.length - 1])
			.filter((item) => item[0] !== 'date')
			.map((token) => ({ name: token[0], value: token[1] }))
			.sort((a, b) => b.value - a.value)

		const otherTvl = tvls.slice(5).reduce((total, entry) => {
			return (total += entry.value)
		}, 0)

		const tokenTvls = tvls.slice(0, 5).concat({ name: 'Others', value: otherTvl })

		const tokensList = tvls.map(({ name, value }) => {
			const tokenTvl = forkedTokensData.find((p) => p.name.toLowerCase() === name.toLowerCase())?.tvl ?? null
			const ftot = tokenTvl ? (value / tokenTvl) * 100 : null

			return {
				name,
				forkedProtocols: tokensProtocols[name],
				tvl: value,
				ftot: ftot
			}
		})

		return { tokenTvls, tokensList }
	}, [stackedData, tokensProtocols, forkedTokensData])

	return (
		<>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Forks' }} />

			<Header>Total Value Locked All Forks</Header>

			<ChartsWrapper>
				<ChainPieChart data={tokenTvls} chainColor={tokenColors} />
				<ChainDominanceChart
					stackOffset="expand"
					formatPercent={true}
					stackedDataset={stackedData}
					chainsUnique={tokens}
					chainColor={tokenColors}
					daySum={daySum}
				/>
			</ChartsWrapper>

			<RowLinksWrapper>
				<RowLinksWithDropdown links={tokenLinks} activeLink="All" />
			</RowLinksWrapper>

			<ForksTable data={tokensList} />
		</>
	)
}

export default function Forks(props) {
	return (
		<Layout title={`Forks - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}
