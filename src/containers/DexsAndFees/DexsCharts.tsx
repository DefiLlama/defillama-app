import * as React from 'react'
import dynamic from 'next/dynamic'
import { ChartWrapper } from '~/layout/ProtocolAndPool'
import { FormattedName } from '~/components/FormattedName'
import { TokenLogo } from '~/components/TokenLogo'
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
		<div className="grid grid-cols-1 relative isolate xl:grid-cols-[auto_1fr] bg-[var(--bg6)] border border-[var(--divider)] shadow rounded-xl">
			<div className="flex flex-col gap-6 p-5 col-span-1 w-full xl:w-[380px] rounded-t-xl xl:rounded-l-xl xl:rounded-r-none text-[var(--text1)] bg-[var(--bg7)] overflow-x-auto">
				{isProtocolPage ? (
					<h1 className="flex items-center gap-2 text-xl">Trading Volume</h1>
				) : (
					<h1 className="flex items-center gap-2 text-xl">
						<TokenLogo logo={logo} size={24} />
						<FormattedName text={name ? name + ' ' : ''} maxCharacters={16} fontWeight={700} />
					</h1>
				)}

				<p className="flex flex-col text-base">
					<span className="text-[#545757] dark:text-[#cccccc]">
						{data.disabled === true
							? `Last day volume (${formatTimestampAsDate(
									data.volumeHistory[data.volumeHistory.length - 1].timestamp
							  )})`
							: '24h volume'}
					</span>
					<span className="font-jetbrains font-semibold text-2xl">{formattedNum(data.total1dVolume || '0', true)}</span>
				</p>
				<p className="flex flex-col text-base">
					<span className="text-[#545757] dark:text-[#cccccc]">
						{data.disabled === true
							? `Last day change (${formatTimestampAsDate(
									data.volumeHistory[data.volumeHistory.length - 1].timestamp
							  )})`
							: '24 change'}
					</span>
					<span className="font-jetbrains font-semibold text-2xl">{data.change1dVolume || 0}%</span>
				</p>
			</div>

			<ChartWrapper>
				{chartData && chartData.length > 0 && !isProtocolPage && (
					<StackedBarChart title="Total volume" chartData={chartData} />
				)}
				{chainsChart && <StackedBarChart title="Volume by chain" chartData={chainsChart} />}
			</ChartWrapper>
		</div>
	)
}
