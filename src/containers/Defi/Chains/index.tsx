import * as React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { DefiChainsTable } from '~/components/Table/Defi'
import { ProtocolsChainsSearch } from '~/components/Search'
import { RowLinksWithDropdown } from '~/components/Filters'
import { toNiceCsvDate, download } from '~/utils'
import { getNewChainsPageData } from '~/api/categories/protocols'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { formatDataWithExtraTvls, groupDataWithTvlsByDay } from '~/hooks/data/defi'
import { useDefiManager } from '~/contexts/LocalStorage'
import { useGroupChainsByParent } from '~/hooks/data'
import { LayoutWrapper } from '~/containers/ChainContainer'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
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

export default function ChainsContainer({
	chainsUnique,
	chainTvls,
	stackedDataset,
	category,
	categories,
	chainsGroupbyParent,
	tvlTypes,
	colorsByChain,
	chainAssets
}) {
	const { query } = useRouter()
	const { minTvl, maxTvl } = query
	const [extraTvlsEnabled] = useDefiManager()

	const { dataByChain, pieChartData, chainsWithExtraTvlsAndDominanceByDay, chainsUniqueFiltered } =
		React.useMemo(() => {
			// add extra tvls like staking pool2 based on toggles selected
			const dataByChain = formatDataWithExtraTvls({
				data: chainTvls,
				applyLqAndDc: true,
				extraTvlsEnabled,
				chainAssets
			}).filter(
				(chain) =>
					(typeof minTvl === 'string' && minTvl !== '' ? chain.tvl >= +minTvl : true) &&
					(typeof maxTvl === 'string' && maxTvl !== '' ? chain.tvl <= +maxTvl : true)
			)

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
				<nav className="flex">
					<RowLinksWithDropdown links={categories} activeLink={category} />
				</nav>

				<div className="flex items-center justify-between gap-3 flex-wrap">
					<h1 className="text-2xl font-medium">Total Value Locked All Chains</h1>
					<CSVDownloadButton onClick={downloadCsv} />
				</div>

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
