import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { RowLinksWithDropdown } from '~/components/Filters'
import { formatChartTvlsByDay } from '~/hooks/data'
import { formattedNum, getPercentChange, getPrevTvlFromChart2, getTokenDominance } from '~/utils'
import { formatDataWithExtraTvls } from '~/hooks/data/defi'
import { useDefiManager } from '~/contexts/LocalStorage'
import { ProtocolsTableWithSearch } from '~/components/Table/Defi/Protocols'
import { ChainsSelect, LayoutWrapper, OverallMetricsWrapper } from '~/containers/ChainContainer'
import { StatsSection } from '~/layout/Stats/Medium'
import { Stat } from '~/layout/Stats/Large'
import type { IChartProps } from '~/components/ECharts/types'
import styled from 'styled-components'
import { LazyChart } from '~/layout/ProtocolAndPool'

const Chart = dynamic(() => import('~/components/ECharts/AreaChart2'), {
	ssr: false,
	loading: () => <></>
}) as React.FC<IChartProps>

const charts = ['TVL']

const chartColors = {
	TVL: '#4f8fea'
}

export const ForkContainer = ({
	chartData,
	tokenLinks,
	token,
	filteredProtocols,
	parentTokens,
	skipTableVirtualization
}) => {
	const [extraTvlsEnabled] = useDefiManager()

	const { protocolsData, parentForks, finalChartData, totalVolume, volumeChangeUSD } = useMemo(() => {
		const protocolsData = formatDataWithExtraTvls({
			data: filteredProtocols,
			extraTvlsEnabled
		})

		const parentForks = formatDataWithExtraTvls({
			data: parentTokens,
			extraTvlsEnabled
		})

		const finalChartData = formatChartTvlsByDay({ data: chartData, extraTvlsEnabled, key: 'TVL' })

		const totalVolume = getPrevTvlFromChart2(finalChartData, 0, 'TVL')
		const tvlPrevDay = getPrevTvlFromChart2(finalChartData, 1, 'TVL')
		const volumeChangeUSD = getPercentChange(totalVolume, tvlPrevDay)
		return { protocolsData, parentForks, finalChartData, totalVolume, volumeChangeUSD }
	}, [chartData, filteredProtocols, parentTokens, extraTvlsEnabled])

	const topToken: { name?: string; tvl?: number } = {}

	if (protocolsData.length > 0) {
		topToken.name = protocolsData[0]?.name
		topToken.tvl = protocolsData[0]?.tvl
	}

	const tvl = formattedNum(totalVolume, true)

	const dominance = getTokenDominance(topToken, totalVolume)

	const percentChange = volumeChangeUSD?.toFixed(2)

	return (
		<LayoutWrapper>
			{tokenLinks?.length > 0 && (
				<ChainsSelect>
					<RowLinksWithDropdown
						links={tokenLinks}
						activeLink={token}
						alternativeOthersText="Others"
						variant="secondary"
					/>
				</ChainsSelect>
			)}

			<StatsSection>
				<OverallMetricsWrapper style={{ gap: '32px' }}>
					<Stat style={{ marginBottom: 0 }}>
						<span>Total Value Locked</span>
						<span>{tvl}</span>
					</Stat>

					<Stat>
						<span>Change (24h)</span>
						<span>{percentChange || 0}%</span>
					</Stat>

					<Stat>
						<span>{topToken.name} Dominance</span>
						<span>{dominance}%</span>
					</Stat>
				</OverallMetricsWrapper>

				<ChartWrapper>
					<Chart chartData={finalChartData} stackColors={chartColors} stacks={charts} title="" valueSymbol="$" />
				</ChartWrapper>
			</StatsSection>

			<ProtocolsTableWithSearch data={protocolsData as any} skipVirtualization={skipTableVirtualization} />
		</LayoutWrapper>
	)
}

const ChartWrapper = styled(LazyChart)`
	padding: 16px 0;
	grid-column: span 1;
	min-height: 392px;
`
