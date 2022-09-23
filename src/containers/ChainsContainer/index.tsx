import * as React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { Header } from '~/Theme'
import { Panel } from '~/components'
import { DefiChainsTable } from '~/components/VirtualTable/Defi'
import { ButtonDark } from '~/components/ButtonStyled'
import { ProtocolsChainsSearch } from '~/components/Search'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { GroupChains } from '~/components/MultiSelect'
import { useCalcTvlPercentagesByDay, useCalcStakePool2Tvl, useGroupChainsByParent } from '~/hooks/data'
import { toNiceCsvDate, getRandomColor, download } from '~/utils'
import { revalidate } from '~/api'
import { getChainsPageData } from '~/api/categories/protocols'

import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'

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
	z-index: 2;

	& > h2 {
		margin: 0 2px 8px;
		font-weight: 600;
		font-size: 0.825rem;
		color: ${({ theme }) => theme.text1};
	}
`

// TODO remvoe all memo hooks
export default function ChainsContainer({
	chainsUnique,
	chainTvls,
	stackedDataset,
	category,
	categories,
	chainsGroupbyParent,
	tvlTypes
}) {
	const colorsByChain = React.useMemo(() => {
		const colors = {}

		chainsUnique.forEach((chain) => {
			colors[chain] = getRandomColor()
		})

		return colors
	}, [chainsUnique])

	const chainTotals = useCalcStakePool2Tvl(chainTvls, undefined, undefined, true)

	const chainsTvlValues = React.useMemo(() => {
		const data = chainTotals.map((chain) => ({
			name: chain.name,
			value: chain.tvl
		}))

		const otherTvl = data.slice(10).reduce((total, entry) => {
			return (total += entry.value)
		}, 0)

		return data
			.slice(0, 10)
			.sort((a, b) => b.value - a.value)
			.concat({ name: 'Others', value: otherTvl })
	}, [chainTotals])

	const stackedData = useCalcTvlPercentagesByDay(stackedDataset, tvlTypes)

	const downloadCsv = () => {
		const rows = [['Timestamp', 'Date', ...chainsUnique]]

		stackedData
			.sort((a, b) => a.date - b.date)
			.forEach((day) => {
				rows.push([day.date, toNiceCsvDate(day.date), ...chainsUnique.map((chain) => day[chain] ?? '')])
			})
		download('chains.csv', rows.map((r) => r.join(',')).join('\n'))
	}

	const showByGroup = ['All', 'Non-EVM'].includes(category) ? true : false

	const groupedChains = useGroupChainsByParent(chainTotals, showByGroup ? chainsGroupbyParent : {})

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
				<PieChart chartData={chainsTvlValues} stackColors={colorsByChain} />
				<AreaChart
					chartData={stackedData}
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
				<h2>Filters</h2>
				<GroupChains label="Filters" />
			</ChainTvlsFilter>
			<RowLinksWrapper>
				<RowLinksWithDropdown links={categories} activeLink={category} />
			</RowLinksWrapper>
			<DefiChainsTable data={groupedChains} />
		</>
	)
}
