import * as React from 'react'
import { ProtocolsChainsSearch } from '~/components/Search'
import { bridgedChainColumns } from '~/components/Table/Defi/columns'
import { StatsSection } from '~/layout/Stats/Medium'
import Layout from '~/layout'
import SEO from '~/components/SEO'
import { DetailsWrapper, Name } from '~/layout/ProtocolAndPool'
import { Stat } from '~/layout/Stats/Large'
import { chainIconUrl, formattedNum } from '~/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { FormattedName } from '~/components/FormattedName'
import { Denomination, Filters } from '~/components/ECharts/ProtocolChart/Misc'
import dynamic from 'next/dynamic'
import { IBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import styled from 'styled-components'
import useWindowSize from '~/hooks/useWindowSize'
import { SortingState, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import VirtualTable from '~/components/Table/Table'

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>
const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

const Stats = styled(StatsSection)``

export default function ChainBridged({ chainData, chain, inflows, tokenInflowNames, chainName = 'All Chains' }) {
	const [chartType, setChartType] = React.useState('total')
	const top10Tokens = Object.entries(chainData?.[chartType]?.breakdown ?? [])
		.sort((a, b) => +b[1] - +a[1])
		.slice(0, 10)
	const otherTokens = Object.entries(chainData?.[chartType]?.breakdown ?? [])
		.sort((a, b) => +b[1] - +a[1])
		.slice(10)
	const otherTotal = otherTokens.reduce((acc, [_, value]) => acc + +value, 0)
	const tokens = [...top10Tokens, ['Other', otherTotal]]
	const screenWidth = useWindowSize()
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'value', desc: true }])
	const instance = useReactTable({
		data: Object.entries(chainData?.[chartType]?.breakdown ?? []).map(([name, value]) => ({
			name: name?.toLowerCase() === name ? name?.toUpperCase() : name,
			value
		})),
		columns: bridgedChainColumns,
		state: {
			sorting
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return (
		<>
			<Layout title={`${chainName}: Bridged TVL - DefiLlama`} style={{ gap: '24px' }}>
				<ProtocolsChainsSearch
					hideFilters
					step={{
						category: 'Chains',
						name: 'All Chains'
					}}
				/>
				<SEO cardName={chainName} token={chain} />
				<Stats>
					<DetailsWrapper style={{ background: 'none' }}>
						<Name>
							<TokenLogo logo={chainIconUrl(chain)} size={24} />
							<FormattedName text={chainName + ' Bridged TVL'} fontWeight={700} />
						</Name>

						<Stat>
							<span>Total</span>
							<span>
								{formattedNum(
									+chainData?.total.total + (+chainData?.ownTokens?.total ? +chainData?.ownTokens?.total : 0),
									true
								)}
							</span>
						</Stat>
						<Stat>
							<span>Canonical</span>
							<span>{formattedNum(chainData?.canonical?.total, true)}</span>
						</Stat>
						<Stat>
							<span>Native</span>
							<span>{formattedNum(chainData?.native?.total, true)}</span>
						</Stat>
						<Stat>
							<span>Third Party</span>
							<span>{formattedNum(chainData?.thirdParty?.total, true)}</span>
						</Stat>
						{chainData?.ownTokens?.total ? (
							<Stat>
								<span>Own Tokens</span>
								<span>{formattedNum(chainData?.ownTokens.total, true)}</span>
							</Stat>
						) : null}
					</DetailsWrapper>
					<div
						style={{
							flex: 1,
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: '16px',
							marginTop: '16px',
							padding: '8px 24px 20px 0',
							minHeight: '460px'
						}}
					>
						<h2 style={{ margin: '0 auto' }}>Tokens Breakdown</h2>

						<Filters style={{ marginLeft: '16px' }}>
							{[
								{ type: 'total', name: 'Total' },
								{ type: 'canonical', name: 'Canonical' },
								{ type: 'native', name: 'Native' },
								{ type: 'thirdParty', name: 'Third Party' },
								inflows ? { type: 'inflows', name: 'Inflows' } : null,
								chainData?.ownTokens?.total ? { type: 'ownTokens', name: 'Own Tokens' } : null
							]
								.filter(Boolean)
								.map(({ type, name }) =>
									chainData[type]?.total !== '0' ? (
										<Denomination as="button" active={chartType === type} onClick={() => setChartType(type)} key={name}>
											{name}
										</Denomination>
									) : null
								)}
						</Filters>

						{chartType !== 'inflows' ? (
							<div style={{ width: Math.min(+screenWidth.width / 1.5, 600) + 'px' }}>
								<PieChart
									chartData={tokens.map(([name, value]: [string, string]) => ({
										name,
										value: +value
									}))}
									usdFormat={false}
								/>
							</div>
						) : (
							<div style={{ width: '100%' }}>
								<BarChart
									chartData={inflows}
									title=""
									hideDefaultLegend={true}
									customLegendName="Token"
									customLegendOptions={tokenInflowNames}
									// chartOptions={inflowsChartOptions}
								/>
							</div>
						)}
					</div>
				</Stats>
				{chartType !== 'inflows' ? <VirtualTable instance={instance} cellStyles={{ overflow: 'visible' }} /> : null}
			</Layout>
		</>
	)
}
