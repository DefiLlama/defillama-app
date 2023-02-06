import dynamic from 'next/dynamic'
import { useFetchProtocolTreasury } from '~/api/categories/protocols/client'
import type { IPieChartProps } from '~/components/ECharts/types'
import { Section } from '~/layout/ProtocolAndPool'

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

export function Treasury({ protocolName }) {
	const { data } = useFetchProtocolTreasury(protocolName)

	const tokens = Object.entries(data?.chainTvls ?? {})
		.filter((chain) => !chain[0].endsWith('-OwnTokens'))
		.reduce((acc, curr: [string, { tokensInUsd: Array<{ date: number; tokens: { [token: string]: number } }> }]) => {
			if (curr[1].tokensInUsd.length > 0) {
				const tokens = curr[1].tokensInUsd.slice(-1)[0].tokens

				for (const token in tokens) {
					acc = [...acc, { name: token, value: tokens[token] }]
				}
			}

			return acc
		}, [])

	return (
		<Section>
			<h3>Treasury</h3>

			<span style={{ minHeight: '320px' }}>{data && <PieChart chartData={tokens} />}</span>
		</Section>
	)
}
