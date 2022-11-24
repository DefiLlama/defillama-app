import * as React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { Header } from '~/Theme'
import { Panel } from '~/components'
import { DefiChainsTable } from '~/components/Table/Defi'
import { ButtonDark } from '~/components/ButtonStyled'
import { ProtocolsChainsSearch } from '~/components/Search'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { GroupChains } from '~/components/MultiSelect'
import { toNiceCsvDate, download } from '~/utils'
import { revalidate } from '~/api'
import { getChainsPageData, getNewChainsPageData } from '~/api/categories/protocols'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { formatDataWithExtraTvls, groupDataWithTvlsByDay } from '~/hooks/data/defi'
import { useDefiManager } from '~/contexts/LocalStorage'
import { useGroupChainsByParent } from '~/hooks/data'

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

export async function getStaticProps() {
	const data = await getChainsPageData('All')
	return {
		...data,
		revalidate: revalidate()
	}
}

const ChartsWrapper = styled(Panel)`
	min-height: 402px;
	display: grid;
	grid-template-columns: 1fr;
	gap: 16px;

	& > * {
		grid-cols: span 1;
	}

	@media screen and (min-width: 80rem) {
		grid-template-columns: 1fr 1fr;
	}
`

const HeaderWrapper = styled(Header)`
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-wrap: wrap;
	gap: 12px;
	border: 1px solid transparent;
`

const ChainTvlsFilter = styled.form`
	& > h2 {
		margin: 0 2px 8px;
		font-weight: 600;
		font-size: 0.825rem;
		color: ${({ theme }) => theme.text1};
	}
`

export default function ChainsContainer({
	chainsUnique,
	chainTvls,
	stackedDataset,
	category,
	categories,
	chainsGroupbyParent,
	tvlTypes,
	colorsByChain
}) {
	const [extraTvlsEnabled] = useDefiManager()

	const { dataByChain, pieChartData, chainsWithExtraTvlsByDay, chainsWithExtraTvlsAndDominanceByDay } =
		React.useMemo(() => {
			// add extra tvls like staking pool2 based on toggles selected
			const dataByChain = formatDataWithExtraTvls({ data: chainTvls, applyLqAndDc: true, extraTvlsEnabled })

			// format chains data to use in pie chart
			const onlyChainTvls = dataByChain.map((chain) => ({
				name: chain.name,
				value: chain.tvl
			}))

			const chainsWithLowTvls = onlyChainTvls.slice(10).reduce((total, entry) => {
				return (total += entry.value)
			}, 0)

			// limit chains in pie chart to 10 and remaining chains in others
			const pieChartData = onlyChainTvls
				.slice(0, 10)
				.sort((a, b) => b.value - a.value)
				.concat({ name: 'Others', value: chainsWithLowTvls })

			const { chainsWithExtraTvlsByDay, chainsWithExtraTvlsAndDominanceByDay } = groupDataWithTvlsByDay({
				chains: stackedDataset,
				tvlTypes,
				extraTvlsEnabled
			})

			return { dataByChain, pieChartData, chainsWithExtraTvlsByDay, chainsWithExtraTvlsAndDominanceByDay }
		}, [chainTvls, extraTvlsEnabled, stackedDataset, tvlTypes])

	const downloadCsv = async () => {
		window.alert("Data download might take up to 1 minute, click OK to proceed")
		const rows = [['Timestamp', 'Date', ...chainsUnique]]
		const {props} = await getNewChainsPageData("All")
		const { chainsWithExtraTvlsByDay } = groupDataWithTvlsByDay({
			chains: props.stackedDataset,
			tvlTypes,
			extraTvlsEnabled
		})

		chainsWithExtraTvlsByDay
			.sort((a, b) => a.date - b.date)
			.forEach((day) => {
				rows.push([day.date, toNiceCsvDate(day.date), ...chainsUnique.map((chain) => day[chain] ?? '')])
			})
		download('chains.csv', rows.map((r) => r.join(',')).join('\n'))
	}

	const showByGroup = ['All', 'Non-EVM'].includes(category) ? true : false

	const groupedChains = useGroupChainsByParent(dataByChain, showByGroup ? chainsGroupbyParent : {})

	return (
		<>
			<ProtocolsChainsSearch
				step={{
					category: 'Chains',
					name: category === 'All' ? 'All Chains' : category
				}}
			/>

			<HeaderWrapper>
				<span>Total Value Locked All Chains</span>
				<ButtonDark onClick={downloadCsv}>Download all data in .csv</ButtonDark>
			</HeaderWrapper>

			<ChartsWrapper>
				<PieChart chartData={pieChartData} stackColors={colorsByChain} />
				<AreaChart
					chartData={chainsWithExtraTvlsAndDominanceByDay}
					stacks={chainsUnique}
					stackColors={colorsByChain}
					customLegendName="Chain"
					customLegendOptions={chainsUnique}
					hidedefaultlegend
					valueSymbol="%"
					title=""
				/>
			</ChartsWrapper>

			<ChainTvlsFilter>
				<h2>Chain Groups</h2>
				<GroupChains label="Filters" />
			</ChainTvlsFilter>

			<RowLinksWrapper>
				<RowLinksWithDropdown links={categories} activeLink={category} />
			</RowLinksWrapper>
			<DefiChainsTable data={groupedChains} />
		</>
	)
}
