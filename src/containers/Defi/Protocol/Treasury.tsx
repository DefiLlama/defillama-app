import dynamic from 'next/dynamic'
import { useFetchProtocolTreasury } from '~/api/categories/protocols/client'
import type { IPieChartProps } from '~/components/ECharts/types'
import { LazyChart, Section } from '~/layout/ProtocolAndPool'

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
		.sort((a, b) => b.value - a.value)

	const top10Tokens = tokens.slice(0, 11)

	if (tokens.length > 10) {
		top10Tokens.push({ name: 'Others', value: tokens.slice(11).reduce((acc, curr) => (acc += curr.value), 0) })
	}

	if (!loading && data && top10Tokens.length === 0) {
		return <></>
	}

	return (
		<Section id="treasury">
			<h3>Treasury</h3>

			<TreasuryChart protocolName={protocolName} />
		</Section>
	)
}

export const TreasuryChart = ({ protocolName }) => {
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
		.sort((a, b) => b.value - a.value)

	const top10Tokens = tokens.slice(0, 11)

	if (tokens.length > 10) {
		top10Tokens.push({ name: 'Others', value: tokens.slice(11).reduce((acc, curr) => (acc += curr.value), 0) })
	}

	if (!loading && data && top10Tokens.length === 0) {
		return <></>
	}

	return (
		<LazyChart style={{ minHeight: '320px' }}>
			{data && top10Tokens.length > 0 && <PieChart chartData={top10Tokens} />}
		</LazyChart>
	)
}
