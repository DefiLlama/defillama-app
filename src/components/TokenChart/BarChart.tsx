import { useDarkModeManager } from 'contexts/LocalStorage'
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toK, toNiceDateYear, formattedNum } from 'utils'
import { stringToColour } from './utils'

export default function GeneralBarChart({
  aspect,
  finalChartData,
  tokensUnique,
  color,
  formatDate,
  moneySymbol = '$',
  hallmarks = [],
}) {
  const [darkMode] = useDarkModeManager()
  const textColor = darkMode ? 'white' : 'black'
  const tokenBreakdown = tokensUnique.length > 0

  return (
    <ResponsiveContainer aspect={aspect}>
      <BarChart margin={{ top: 0, right: 10, bottom: 6, left: 10 }} barCategoryGap={1} data={finalChartData}>
        <XAxis
          tickLine={false}
          axisLine={false}
          interval="preserveEnd"
          minTickGap={80}
          tickMargin={14}
          tickFormatter={formatDate}
          dataKey={tokenBreakdown ? 'date' : '0'}
          scale="time"
          type="number"
          tick={{ fill: textColor }}
          domain={['dataMin', 'dataMax']}
        />
        <YAxis
          type="number"
          axisLine={false}
          tickMargin={16}
          tickFormatter={(tick) => moneySymbol + toK(tick)}
          tickLine={false}
          orientation="right"
          interval="preserveEnd"
          minTickGap={80}
          yAxisId={0}
          tick={{ fill: textColor }}
        />
        {hallmarks.map((hallmark, i) => (
          <ReferenceLine x={hallmark[0]} stroke="red" label={hallmark[1]} key={'hall2' + i} />
        ))}
        <Tooltip
          cursor={{ fill: color, opacity: 0.1 }}
          formatter={(val) => formattedNum(val, true)}
          labelFormatter={(label) => toNiceDateYear(label)}
          labelStyle={{ paddingTop: 4 }}
          contentStyle={{
            padding: '10px 14px',
            borderRadius: 10,
            borderColor: color,
            color: 'black',
          }}
          wrapperStyle={{ top: -70, left: -10 }}
        />
        {tokenBreakdown ? (
          tokensUnique.map((token) => (
            <Bar
              key={token}
              type="monotone"
              dataKey={token}
              fill={stringToColour()}
              opacity={'0.8'}
              yAxisId={0}
              stackId="stack"
            />
          ))
        ) : (
          <Bar
            type="monotone"
            name={'Inflow/Outflow'}
            dataKey={'1'}
            fill={color}
            opacity={'0.8'}
            yAxisId={0}
            stroke={color}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}
