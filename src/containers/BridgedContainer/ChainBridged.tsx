import * as React from 'react'
import { ProtocolsChainsSearch } from '~/components/Search'
import { bridgedChainColumns } from '~/components/Table/Defi/columns'
import { StatsSection } from '~/layout/Stats/Medium'
import Layout from '~/layout'
import SEO from '~/components/SEO'
import { DetailsWrapper, Name } from '~/layout/ProtocolAndPool'
import { Stat } from '~/layout/Stats/Large'
import { chainIconUrl, formattedNum } from '~/utils'
import TokenLogo from '~/components/TokenLogo'
import FormattedName from '~/components/FormattedName'
import { Denomination, Filters } from '~/components/ECharts/ProtocolChart/Misc'
import dynamic from 'next/dynamic'
import { IPieChartProps } from '~/components/ECharts/types'
import styled from 'styled-components'
import useWindowSize from '~/hooks/useWindowSize'
import { SortingState, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import VirtualTable from '~/components/Table/Table'

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const Stats = styled(StatsSection)`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;

	@media screen and (max-width: 768px) {
		flex-direction: column;
		align-items: flex-start;
		padding-top: 24px;
	}
`

export default function ChainBridged({ chainData, chain }) {
	const [chartType, setChartType] = React.useState('total')
	const top10Tokens = Object.entries(chainData?.[chartType]?.breakdown)
		.sort((a, b) => +b[1] - +a[1])
		.slice(0, 10)
	const otherTokens = Object.entries(chainData?.[chartType]?.breakdown)
		.sort((a, b) => +b[1] - +a[1])
		.slice(10)
	const otherTotal = otherTokens.reduce((acc, [_, value]) => acc + +value, 0)
	const tokens = [...top10Tokens, ['Other', otherTotal]]
	const screenWidth = useWindowSize()
	const [sorting, setSorting] = React.useState<SortingState>([])

	const instance = useReactTable({
		data: Object.entries(chainData?.[chartType]?.breakdown).map(([name, value]) => ({
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
			<Layout title={`${chain}: Bridged TVL - DefiLlama`} style={{ gap: '24px' }}>
				<ProtocolsChainsSearch
					hideFilters
					step={{
						category: 'Chains',
						name: 'All Chains'
					}}
				/>
				<SEO cardName={chain} token={chain} />
				<Stats>
					<DetailsWrapper style={{ paddingTop: '0px', background: 'none' }}>
						<Name>
							<TokenLogo logo={chainIconUrl(chain)} size={24} />
							<FormattedName text={chain + ' Bridged TVL'} fontWeight={700} />
						</Name>

						<Stat>
							<span>Total</span>
							<span>{formattedNum(chainData?.total.total, true)}</span>
						</Stat>
						<Stat>
							<span>Canonical</span>
							<span>{formattedNum(chainData?.canonical.total, true)}</span>
						</Stat>
						<Stat>
							<span>Native</span>
							<span>{formattedNum(chainData?.native.total, true)}</span>
						</Stat>
						<Stat>
							<span>Third Party</span>
							<span>{formattedNum(chainData?.thirdParty.total, true)}</span>
						</Stat>
					</DetailsWrapper>
					<div
						style={{
							flex: 1,
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: '16px',
							marginTop: '16px',
							padding: '24px 24px 20px 0',
							minHeight: '460px'
						}}
					>
						<h2 style={{ margin: '0 auto' }}>Tokens Breakdown</h2>

						<Filters style={{ marginLeft: '16px' }}>
							{[
								{ type: 'total', name: 'Total' },
								{ type: 'canonical', name: 'Canonical' },
								{ type: 'native', name: 'Native' },
								{ type: 'thirdParty', name: 'Third Party' }
							].map(({ type, name }) =>
								chainData[type]?.total !== '0' ? (
									<Denomination as="button" active={chartType === type} onClick={() => setChartType(type)}>
										{name}
									</Denomination>
								) : null
							)}
						</Filters>

						<div style={{ width: Math.min(+screenWidth.width / 1.5, 600) + 'px' }}>
							<PieChart
								chartData={tokens.map(([name, value]: [string, string]) => ({
									name,
									value: +value
								}))}
								usdFormat={false}
							/>
						</div>
					</div>
				</Stats>
				<VirtualTable instance={instance} cellStyles={{ overflow: 'visible' }} />
			</Layout>
		</>
	)
}
