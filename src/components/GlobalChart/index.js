import { useState, useEffect, useRef } from 'react'
import { ResponsiveContainer } from 'recharts'
import TradingViewChart from '~/components/TradingviewChart'
import { useIsClient } from '~/hooks'

const GlobalChart = ({
	dailyData,
	unit = 'USD',
	totalLiquidity,
	liquidityChange,
	title = 'Total TVL',
	dualAxis = false
}) => {
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
	}, [isClient, width])

	let moneySymbol = '$'

	switch (unit) {
		case 'ETH':
			moneySymbol = 'Ξ'
			break
		case 'USD':
			moneySymbol = '$'
			break
		default:
			moneySymbol = unit ? unit.slice(0, 1) : '$'
	}

	return (
		<ResponsiveContainer aspect={60 / 28} ref={ref}>
			<TradingViewChart
				data={dailyData}
				base={totalLiquidity}
				baseChange={liquidityChange}
				title={title}
				field="1"
				width={width}
				units={moneySymbol}
				dualAxis={dualAxis}
			/>
		</ResponsiveContainer>
	)
}

export default GlobalChart
