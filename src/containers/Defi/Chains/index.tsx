import * as React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { Header } from '~/Theme'
import { DefiChainsTable } from '~/components/Table/Defi'
import { ButtonDark } from '~/components/ButtonStyled'
import { ProtocolsChainsSearch } from '~/components/Search'
import { RowLinksWithDropdown } from '~/components/Filters'
import { toNiceCsvDate, download } from '~/utils'
import { getNewChainsPageData } from '~/api/categories/protocols'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { formatDataWithExtraTvls, groupDataWithTvlsByDay } from '~/hooks/data/defi'
import { useDefiManager } from '~/contexts/LocalStorage'
import { useGroupChainsByParent } from '~/hooks/data'
import { ChainsSelect, LayoutWrapper } from '~/containers/ChainContainer'
import { useRouter } from 'next/router'

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

const ChartsWrapper = styled.div`
	min-height: 402px;
	display: grid;
	grid-template-columns: 1fr;
	gap: 16px;
	background: ${({ theme }) => theme.bg6};
	border: ${({ theme }) => '1px solid ' + theme.divider};
	box-shadow: ${({ theme }) => theme.shadowSm};
	border-radius: 12px;

	& > * {
		grid-cols: span 1;
	}

	@media screen and (min-width: 80rem) {
		grid-template-columns: 1fr 1fr;
	}
`

const HeaderWrapper = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-wrap: wrap;
	gap: 12px;
	border: 1px solid transparent;

	button {
		position: relative;
		bottom: -2px;
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
	const { query } = useRouter()
	const { minTvl, maxTvl } = query
	const [extraTvlsEnabled] = useDefiManager()

	const { dataByChain, pieChartData, chainsWithExtraTvlsAndDominanceByDay, chainsUniqueFiltered } =
		React.useMemo(() => {
			// add extra tvls like staking pool2 based on toggles selected
			const dataByChain = formatDataWithExtraTvls({
				data: chainTvls.filter((chain) => (minTvl ? chain.tvl > minTvl : true) && (maxTvl ? chain.tvl < maxTvl : true)),
				applyLqAndDc: true,
				extraTvlsEnabled
			})

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

			return {
				dataByChain,
				pieChartData,
				chainsWithExtraTvlsByDay,
				chainsWithExtraTvlsAndDominanceByDay,
				chainsUniqueFiltered: chainsUnique.filter((chain) => (dataByChain.find((c) => c.name === chain) ? true : false))
			}
		}, [chainTvls, extraTvlsEnabled, stackedDataset, tvlTypes, minTvl, maxTvl, chainsUnique])

	const downloadCsv = async () => {
		window.alert('Data download might take up to 1 minute, click OK to proceed')
		const rows = [['Timestamp', 'Date', ...chainsUniqueFiltered]]
		const { props } = await getNewChainsPageData('All')
		const { chainsWithExtraTvlsByDay } = groupDataWithTvlsByDay({
			chains: props.stackedDataset,
			tvlTypes,
			extraTvlsEnabled
		})

		chainsWithExtraTvlsByDay
			.sort((a, b) => a.date - b.date)
			.forEach((day) => {
				rows.push([day.date, toNiceCsvDate(day.date), ...chainsUniqueFiltered.map((chain) => day[chain] ?? '')])
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

			<LayoutWrapper>
				<ChainsSelect>
					<RowLinksWithDropdown links={categories} activeLink={category} variant="secondary" />
				</ChainsSelect>

				<HeaderWrapper>
					<Header>Total Value Locked All Chains</Header>
					<ButtonDark onClick={downloadCsv}>Download all data in .csv</ButtonDark>
				</HeaderWrapper>

				<ChartsWrapper>
					<PieChart chartData={pieChartData} stackColors={colorsByChain} />
					<AreaChart
						chartData={chainsWithExtraTvlsAndDominanceByDay}
						stacks={chainsUniqueFiltered}
						stackColors={colorsByChain}
						customLegendName="Chain"
						customLegendOptions={chainsUniqueFiltered}
						hideDefaultLegend
						valueSymbol="%"
						title=""
						expandTo100Percent={true}
					/>
				</ChartsWrapper>

				<DefiChainsTable data={groupedChains} />
			</LayoutWrapper>
		</>
	)
}
