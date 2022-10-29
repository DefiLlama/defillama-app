import { useState, useEffect, useRef, useMemo } from 'react'
import { ResponsiveContainer } from 'recharts'
import TradingViewChart from '~/components/TradingviewChart'
import { useIsClient } from '~/hooks'

const GlobalNFTChart = ({ chartData, dailyVolume, dailyVolumeChange, unit = '', symbol = '', displayUsd = false }) => {
	const filteredChartData = useMemo(() => {
		if (displayUsd) {
			return chartData.map(({ timestamp, volumeUSD }) => [timestamp, volumeUSD])
		}
		return chartData.map(({ timestamp, volume }) => [timestamp, volume])
	}, [chartData, displayUsd])

	// update the width on a window resize
	const ref = useRef()
	const isClient = useIsClient()
	const [width, setWidth] = useState(ref?.current?.container?.clientWidth)
	useEffect(() => {
		if (!isClient) {
			return false
		}

		function handleResize() {
			setWidth(ref?.current?.container?.clientWidth ?? width)
		}

		window.addEventListener('resize', handleResize)

		return window.removeEventListener('resize', handleResize)
	}, [isClient, width]) // Empty array ensures that effect is only run on mount and unmount

	return filteredChartData ? (
		<ResponsiveContainer aspect={60 / 28} ref={ref}>
			<TradingViewChart
				data={filteredChartData}
				base={dailyVolume}
				baseChange={dailyVolumeChange}
				title={`Daily Volume ${symbol}`}
				field="1"
				width={width}
				units={unit}
			/>
		</ResponsiveContainer>
	) : (
		''
	)
}

export default GlobalNFTChart
