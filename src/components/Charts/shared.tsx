import * as React from 'react'
import { ResponsiveContainer } from 'recharts'
import styled from 'styled-components'
import { Panel } from '~/components'
import { useMed } from '~/hooks/useBreakpoints'
import { useDarkModeManager } from '~/contexts/LocalStorage'

export const ChartWrapper = ({ children }) => {
	const ref = React.useRef(null)
	const isMobile = useMed()
	const [isDark] = useDarkModeManager()

	const style = {
		margin: !isMobile && '0.3em',
		'--color': isDark ? 'white' : 'black'
	} as React.CSSProperties

	return (
		<PlaceholderChartPanel style={style}>
			<div
				style={{
					position: 'absolute',
					inset: 10
				}}
			>
				<ResponsiveContainer
					width={ref?.current?.container?.clientWidth}
					height={ref?.current?.container?.clientHeight}
				>
					{children}
				</ResponsiveContainer>
			</div>
		</PlaceholderChartPanel>
	)
}

const PlaceholderChartPanel = styled(Panel)`
	padding-bottom: 28%;
	flex: 1;
	color: var(--color);
	min-height: 360px;
	@media screen and (max-width: 800px) {
		padding-bottom: 69%;
	}
`
