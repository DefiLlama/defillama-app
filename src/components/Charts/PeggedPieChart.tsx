import { useState } from 'react'
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from 'recharts'
import { ChartWrapper } from './shared'
import { toK } from '~/utils'
import { useDarkModeManager } from '~/contexts/LocalStorage'

interface IChainData {
	name: string
	value: number
}

interface IChainColor {
	[key: string]: string
}

interface IChainPieChartProps {
	data: IChainData[]
	chainColor: IChainColor
}

interface IChainResponsivePieProps {
	data: IChainData[]
	chainColor: IChainColor
	aspect: number
}

export const PeggedChainPieChart = ({ data, chainColor }: IChainPieChartProps) => {
	const [activeIndex, setActiveIndex] = useState(0)

	const onPieEnter = (_, index) => {
		setActiveIndex(index)
	}
	const coloredData = data.map((c) => ({ ...c, color: chainColor[c.name] }))

	return (
		<ChartWrapper>
			<PieChart>
				<Pie
					activeIndex={activeIndex}
					activeShape={renderActiveShape}
					data={coloredData}
					cx="50%"
					cy="47%"
					innerRadius={'60%'}
					dataKey="value"
					onMouseEnter={onPieEnter}
				>
					{data.map((entry, index) => (
						<Cell key={`cell-${index}`} fill={coloredData[index].color} />
					))}
				</Pie>
			</PieChart>
		</ChartWrapper>
	)
}

export const PeggedChainResponsivePie = ({ data, chainColor, aspect }: IChainResponsivePieProps) => {
	const [activeIndex, setActiveIndex] = useState(0)
	const [isDark] = useDarkModeManager()

	const onPieEnter = (_, index) => {
		setActiveIndex(index)
	}
	const coloredData = data.map((c) => ({ ...c, color: chainColor[c.name] }))

	return (
		<ResponsiveContainer aspect={aspect}>
			<PieChart
				style={{
					color: isDark ? 'white' : 'black'
				}}
			>
				<Pie
					activeIndex={activeIndex}
					activeShape={renderActiveShape}
					data={coloredData}
					cx="50%"
					cy="47%"
					innerRadius={'60%'}
					dataKey="value"
					onMouseEnter={onPieEnter}
				>
					{data.map((entry, index) => (
						<Cell key={`cell-${index}`} fill={coloredData[index].color} />
					))}
				</Pie>
			</PieChart>
		</ResponsiveContainer>
	)
}

const renderActiveShape = (props) => {
	const RADIAN = Math.PI / 180
	const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, payload, percent, value } = props
	const fill = payload.color
	const sector1 = (
		<Sector
			cx={cx}
			cy={cy}
			innerRadius={innerRadius}
			outerRadius={outerRadius}
			startAngle={startAngle}
			endAngle={endAngle}
			fill={fill}
		/>
	)
	const sector2 = (
		<Sector
			cx={cx}
			cy={cy}
			startAngle={startAngle}
			endAngle={endAngle}
			innerRadius={outerRadius + 6}
			outerRadius={outerRadius + 10}
			fill={fill}
		/>
	)
	if (outerRadius < 180) {
		return (
			<>
				{sector1}
				{sector2}
				<text x={cx} y={cy} dy={-8} textAnchor="middle" fill={'currentColor'}>
					{payload.name}
				</text>
				<text x={cx} y={cy} dy={-8 + 18} textAnchor="middle" fill={'currentColor'}>
					{`${toK(value)}`}
				</text>
				<text x={cx} y={cy} dy={-8 + 18 * 2} textAnchor="middle" fill={'currentColor'}>
					{`(${(percent * 100).toFixed(2)}%)`}
				</text>
			</>
		)
	}
	const sin = Math.sin(-RADIAN * midAngle)
	const cos = Math.cos(-RADIAN * midAngle)
	const sx = cx + (outerRadius + 10) * cos
	const sy = cy + (outerRadius + 10) * sin
	const mx = cx + (outerRadius + 30) * cos
	const my = cy + (outerRadius + 30) * sin
	const ex = mx + (cos >= 0 ? 1 : -1) * 22
	const ey = my
	const textAnchor = cos >= 0 ? 'start' : 'end'

	return (
		<g>
			<text x={cx} y={cy} dy={8} textAnchor="middle" fill={'currentColor'}>
				{payload.name}
			</text>
			{sector1}
			{sector2}
			<path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
			<circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
			<text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#777">{`TVL ${toK(value)}`}</text>
			<text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
				{`(Rate ${(percent * 100).toFixed(2)}%)`}
			</text>
		</g>
	)
}
