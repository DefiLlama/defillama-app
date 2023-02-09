import dynamic from 'next/dynamic'
import { useFetchProtocolTreasury } from '~/api/categories/protocols/client'
import type { IPieChartProps } from '~/components/ECharts/types'
import { Section } from '~/layout/ProtocolAndPool'

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

export function Treasury({ protocolName }) {
	const { data, loading } = useFetchProtocolTreasury(protocolName)

	const tokens = Object.entries(data?.chainTvls ?? {})
		.filter((chain) => !chain[0].endsWith('-OwnTokens'))
		.reduce((acc, curr: [string, { tokensInUsd: Array<{ date: number; tokens: { [token: string]: number } }> }]) => {
			if (curr[1].tokensInUsd?.length > 0) {
				const tokens = curr[1].tokensInUsd.slice(-1)[0].tokens

				for (const token in tokens) {
					acc = [...acc, { name: token, value: tokens[token] }]
				}
			}

			return acc
		}, [])

	if (!loading && data && tokens.length === 0) {
		return <></>
	}

	return (
		<Section id="treasury">
			<h3>Treasury</h3>

			<span style={{ minHeight: '320px' }}>{data && tokens.length > 0 && <PieChart chartData={tokens} />}</span>
		</Section>
	)
}
