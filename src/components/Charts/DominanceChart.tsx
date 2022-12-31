import { AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'
import { ChartWrapper } from './shared'
import { toNiceDateYear, formattedNum, toNiceMonthlyDate, getDominancePercent } from '~/utils'

interface IChainColor {
	[key: string]: string
}

interface IDaySum {
	[key: number]: number
}

interface IProps {
	stackOffset?: 'expand'
	formatPercent: boolean
	stackedDataset: any[]
	chainsUnique: string[]
	chainColor: IChainColor
	daySum: IDaySum
}

const toPercent = (decimal: number, fixed = 0) => `${(decimal * 100).toFixed(fixed)}%`

export const ChainDominanceChart = ({
	stackOffset,
	formatPercent,
	stackedDataset,
	chainsUnique,
	chainColor,
	daySum
}: IProps) => (
	<ChartWrapper>
		<AreaChart
			data={stackedDataset}
			stackOffset={stackOffset}
			margin={{
				top: 10,
				right: 30,
				left: 0,
				bottom: 0
			}}
		>
			<XAxis dataKey="date" tickFormatter={toNiceMonthlyDate} />
			<YAxis tickFormatter={(tick) => toPercent(tick)} />
			<Tooltip
				formatter={(val, chain, props) =>
					formatPercent ? getDominancePercent(Number(val), daySum[props.payload.date]) : formattedNum(val)
				}
				labelFormatter={(label) => toNiceDateYear(label)}
				itemSorter={(p) => -p.value}
				labelStyle={{ color: 'black', fontWeight: '500' }}
				contentStyle={{
					padding: '10px 14px',
					borderRadius: 10,
					borderColor: '#00000040',
					color: 'black'
				}}
				wrapperStyle={{ zIndex: 10 }}
			/>
			{chainsUnique.map((chainName) => (
				<Area
					type="monotone"
					dataKey={chainName}
					key={chainName}
					stackId="1"
					fill={chainColor[chainName]}
					stroke={chainColor[chainName]}
				/>
			))}
		</AreaChart>
	</ChartWrapper>
)
