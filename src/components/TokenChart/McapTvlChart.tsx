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
				const mcapAtDate = mcapData.find((x) => -14400000 < x[0] - date * 1000 && x[0] - date * 1000 < 14400000)

				newData.push({ date, TVL: tvl, Mcap: mcapAtDate ? mcapAtDate[1] : 0 })
			})
		}
		return newData
	}, [chartData, data])

	if (loading || error) return null

	return <>{data && <AreaChart chartData={finalData} tokensUnique={['TVL', 'Mcap']} hideLegend={true} {...props} />}</>
}
