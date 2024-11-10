import * as React from 'react'
import dynamic from 'next/dynamic'
import { download } from '~/utils'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { RowLinksWithDropdown } from '~/components/Filters/common/RowLinksWithDropdown'
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

const Oracles = ({
	chartData,
	tokensProtocols,
	tokens,
	tokenLinks,
	oraclesColors,
	chainsByOracle,
	chain,
	oracleMonthlyVolumes = {}
}) => {
	const { chainsWithExtraTvlsByDay, chainsWithExtraTvlsAndDominanceByDay } = useCalcGroupExtraTvlsByDay(chartData)
	const { tokenTvls, tokensList } = React.useMemo(() => {
		const tvls = Object.entries(chainsWithExtraTvlsByDay[chainsWithExtraTvlsByDay.length - 1])
			.filter((item) => item[0] !== 'date')
			.map((token) => ({ name: token[0], value: token[1] ?? 0 } as { name: string; value: number }))
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
				monthlyVolume: oracleMonthlyVolumes[name]
			}
		})

		return { tokenTvls, tokensList }
	}, [chainsWithExtraTvlsByDay, tokensProtocols, chainsByOracle, oracleMonthlyVolumes])

	const downloadCsv = () => {
		const header = Object.keys(tokensList[0]).join(',')
		download('oracles.csv', [header, ...tokensList.map((r) => Object.values(r).join(','))].join('\n'))
	}

	return (
		<>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Oracles' }} />

			<div className="text-2xl font-medium -mb-5 flex items-center justify-between flex-wrap gap-3">
				<h1>Total Value Secured All Oracles {chain ? `on ${chain}` : ''}</h1>
				<ButtonDark onClick={downloadCsv}>Download all data in .csv</ButtonDark>
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-2 *:col-span-1 bg-[var(--bg6)] min-h-[424px] shadow rounded-xl p-4">
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
			</div>

			<nav className="flex items-center gap-5 overflow-hidden -mb-5">
				<RowLinksWithDropdown links={tokenLinks} activeLink={chain || 'All'} />
			</nav>

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
