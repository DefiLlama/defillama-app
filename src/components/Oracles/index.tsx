import * as React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { download } from '~/utils'
import { Header } from '~/Theme'
import { Panel } from '~/components'
import { ProtocolsChainsSearch } from '~/components/Search'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { ButtonDark } from '~/components/ButtonStyled'
import { useCalcGroupExtraTvlsByDay } from '~/hooks/data'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { oraclesColumn } from '~/components/Table/Defi/columns'
import { TableWithSearch } from '~/components/Table/TableWithSearch'

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

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
const Oracles = ({
	chartData,
	tokensProtocols,
	tokens,
	tokenLinks,
	oraclesColors,
	chainsByOracle,
	chain,
	oracleSevenDayVolumes = {}
}) => {
	const { chainsWithExtraTvlsByDay, chainsWithExtraTvlsAndDominanceByDay } = useCalcGroupExtraTvlsByDay(chartData)
	const { tokenTvls, tokensList } = React.useMemo(() => {
		const tvls = Object.entries(chainsWithExtraTvlsByDay[chainsWithExtraTvlsByDay.length - 1])
			.filter((item) => item[0] !== 'date')
			.map((token) => ({ name: token[0], value: token[1] } as { name: string; value: number }))
			.sort((a, b) => b.value - a.value)

		const otherTvl = tvls.slice(5).reduce((total, entry) => {
			return (total += entry.value)
		}, 0)

		const tokenTvls = tvls.slice(0, 5).concat({ name: 'Others', value: otherTvl })

		const tokensList = tvls.map(({ name, value }) => {
			return {
				name,
				protocolsSecured: tokensProtocols[name],
				tvs: value,
				chains: chainsByOracle[name],
				sevenDayVolume: oracleSevenDayVolumes[name]
			}
		})

		return { tokenTvls, tokensList }
	}, [chainsWithExtraTvlsByDay, tokensProtocols, chainsByOracle, oracleSevenDayVolumes])

	const downloadCsv = () => {
		const header = Object.keys(tokensList[0]).join(',')
		download('oracles.csv', [header, ...tokensList.map((r) => Object.values(r).join(','))].join('\n'))
	}

	return (
		<>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Oracles' }} />

			<Header>
				Total Value Secured All Oracles {chain ? `on ${chain}` : ''}
				<ButtonDark onClick={downloadCsv} style={{ width: '120px', float: 'right' }}>
					Download all data in .csv
				</ButtonDark>
			</Header>

			<ChartsWrapper>
				<PieChart chartData={tokenTvls} stackColors={oraclesColors} />
				<AreaChart
					chartData={chainsWithExtraTvlsAndDominanceByDay}
					stacks={tokens}
					stackColors={oraclesColors}
					customLegendName="Oracle"
					customLegendOptions={tokens}
					hideDefaultLegend
					valueSymbol="%"
					title=""
					expandTo100Percent={true}
				/>
			</ChartsWrapper>

			<RowLinksWrapper>
				<RowLinksWithDropdown links={tokenLinks} activeLink={chain || 'All'} />
			</RowLinksWrapper>

			<TableWithSearch
				data={tokensList}
				columns={oraclesColumn}
				columnToSearch={'name'}
				placeholder={'Search oracles...'}
			/>
		</>
	)
}

export default Oracles
