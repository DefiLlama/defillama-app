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

			chartData.map(([date, tvl]) => {
				const mcapAtDate = mcapData.find((x) => x[0] === date * 1000)

				if (mcapAtDate) {
					newData.push([date, mcapAtDate[1] / tvl])
				}
			})
		}
		return newData
	}, [chartData, data])

	if (loading || error) return null

	return <>{data && <AreaChart chartData={finalData} {...props} />}</>
}
