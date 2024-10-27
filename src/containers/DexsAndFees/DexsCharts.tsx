import * as React from 'react'
import dynamic from 'next/dynamic'
import { DetailsWrapper, Name, ChartWrapper } from '~/layout/ProtocolAndPool'
import { StatsSection } from '~/layout/Stats/Medium'
import { Stat } from '~/layout/Stats/Large'
import FormattedName from '~/components/FormattedName'
import TokenLogo from '~/components/TokenLogo'
import { formattedNum } from '~/utils'
import { IDexResponse } from '~/api/categories/dexs/types'
import type { IStackedBarChartProps } from '~/components/ECharts/BarChart/Stacked'
import { formatTimestampAsDate } from '~/api/categories/dexs/utils'
import { LocalLoader } from '~/components/LocalLoader'

// TODO remove duplicate bar chart component and use '~/components/ECharts/BarChart'
const StackedBarChart = dynamic(() => import('~/components/ECharts/BarChart/Stacked'), {
	ssr: false,
	loading: () => (
		<div className="flex items-center justify-center m-auto min-h-[360px]">
			<LocalLoader />
		</div>
	)
}) as React.FC<IStackedBarChartProps>

interface IDexChartsProps {
	data: IDexResponse
	chartData: {
		name: string
		data: [Date, number][]
	}[]
	name: string
	logo?: string
	isProtocolPage?: boolean
	chainsChart?: IDexChartsProps['chartData']
}

export const DexCharts = ({ logo, data, chartData, name, chainsChart, isProtocolPage = false }: IDexChartsProps) => {
	return (
		<StatsSection>
			<DetailsWrapper>
				{isProtocolPage ? (
					<Name>Trading Volume</Name>
				) : (
					<Name>
						<TokenLogo logo={logo} size={24} />
						<FormattedName text={name ? name + ' ' : ''} maxCharacters={16} fontWeight={700} />
					</Name>
				)}

				<Stat>
					<span>
						{data.disabled === true
							? `Last day volume (${formatTimestampAsDate(
									data.volumeHistory[data.volumeHistory.length - 1].timestamp
							  )})`
							: '24h volume'}
					</span>
					<span>{formattedNum(data.total1dVolume || '0', true)}</span>
				</Stat>

				<Stat>
					<span>
						{data.disabled === true
							? `Last day change (${formatTimestampAsDate(
									data.volumeHistory[data.volumeHistory.length - 1].timestamp
							  )})`
							: '24 change'}
					</span>
					<span>{data.change1dVolume || 0}%</span>
				</Stat>
			</DetailsWrapper>

			<ChartWrapper>
				{chartData && chartData.length > 0 && !isProtocolPage && (
					<StackedBarChart title="Total volume" chartData={chartData} />
				)}
				{chainsChart && <StackedBarChart title="Volume by chain" chartData={chainsChart} />}
			</ChartWrapper>
		</StatsSection>
	)
}
