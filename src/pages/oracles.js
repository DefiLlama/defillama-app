import { useMemo } from 'react'
import styled from 'styled-components'
import { Box } from 'rebass'
import Layout from '~/layout'
import { Header } from '~/Theme'
import { CustomLink } from '~/components/Link'
import { ProtocolsChainsSearch } from '~/components/Search'
import { ChainDominanceChart, ChainPieChart } from '~/components/Charts'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import Table, { Index } from '~/components/Table'
import { useCalcGroupExtraTvlsByDay } from '~/hooks/data'
import { getRandomColor, toK } from '~/utils'
import { revalidate } from '~/api'
import { getOraclePageData } from '~/api/categories/protocols'

export async function getStaticProps() {
	const data = await getOraclePageData()

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

const columns = [
	{
		header: 'Name',
		accessor: 'name',
		disableSortBy: true,
		Cell: ({ value, rowIndex }) => {
			return (
				<Index>
					<span>{rowIndex + 1}</span>
					<CustomLink href={`/oracles/${value}`}>{value}</CustomLink>
				</Index>
			)
		}
	},
	{
		header: 'Protocols Secured',
		accessor: 'protocolsSecured'
	},
	{
		header: 'TVS',
		accessor: 'tvs',
		helperText: 'Excludes CeFi',
		Cell: ({ value }) => {
			return <span>{'$' + toK(value)}</span>
		}
	}
]

const PageView = ({ chartData, tokensProtocols, tokens, tokenLinks }) => {
	const tokenColors = useMemo(
		() => Object.fromEntries([...tokens, 'Others'].map((token) => [token, getRandomColor()])),
		[tokens]
	)

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
			return { name, protocolsSecured: tokensProtocols[name], tvs: value }
		})

		return { tokenTvls, tokensList }
	}, [stackedData, tokensProtocols])

	return (
		<>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Oracles' }} />

			<Header>Total Value Secured All Oracles</Header>

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

			<Table columns={columns} data={tokensList} />
		</>
	)
}

export default function Oracles(props) {
	return (
		<Layout title={`Oracles - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}
