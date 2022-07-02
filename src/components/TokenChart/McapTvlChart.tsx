import * as React from 'react'
import dynamic from 'next/dynamic'
import { useDenominationPriceHistory } from '~/utils/dataApi'
import { IChartProps, IProtocolMcapTVLChartProps } from './types'

const AreaChart = dynamic(() => import('./AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

export default function ProtocolMcapTVLChart({ geckoId, chartData, ...props }: IProtocolMcapTVLChartProps) {
	const { data, loading, error } = useDenominationPriceHistory(geckoId)

	const finalData = React.useMemo(() => {
		const newData = []

		if (data) {
			const mcapData = data['market_caps']
			let index = 0
			let prevMcapDate = 0

			for (let i = 0; i < chartData.length; i++) {
				const date = chartData[i][0] * 1000
				while (index < mcapData.length && Math.abs(date - prevMcapDate) > Math.abs(date - mcapData[index][0])) {
					prevMcapDate = mcapData[index][0]
					index++
				}
				const mcap = mcapData[index - 1][1]
				newData.push([chartData[i][0], mcap / chartData[i][1]])
			}
		}
		return newData
	}, [chartData, data])

	if (loading || error) return null

	return <>{data && <AreaChart chartData={finalData} {...props} />}</>
}
