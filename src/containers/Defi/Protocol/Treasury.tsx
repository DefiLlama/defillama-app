import dynamic from 'next/dynamic'
import { useFetchProtocolTreasury } from '~/api/categories/protocols/client'
import { formatProtocolsTvlChartData } from '~/components/ECharts/ProtocolChart/ProtocolChart'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { ChartsWrapper, LazyChart, Section } from '~/layout/ProtocolAndPool'
import { buildProtocolAddlChartsData } from './utils'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

export function Treasury({ protocolName }) {
	return (
		<Section id="treasury">
			<h3>Treasury</h3>

			<TreasuryChart protocolName={protocolName} />
		</Section>
	)
}

export const TreasuryChart = ({ protocolName }) => {
	const { data, loading } = useFetchProtocolTreasury(protocolName)

	if (loading) {
		return <p style={{ margin: '180px 0', textAlign: 'center' }}>Loading...</p>
	}

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

	if (!loading && (!data || top10Tokens.length === 0)) {
		return <p style={{ margin: '180px 0', textAlign: 'center' }}>Loading...</p>
	}

	const historicalTreasury = formatProtocolsTvlChartData({
		historicalChainTvls: data?.chainTvls ?? [],
		extraTvlEnabled: {}
	})

	const { tokenBreakdown, tokenBreakdownUSD, tokensUnique } = buildProtocolAddlChartsData({
		protocolData: data,
		extraTvlsEnabled: {}
	})

	return (
		<ChartsWrapper style={{ background: 'none', border: 'none', padding: 0 }}>
			<LazyChart style={{ minHeight: '320px' }}>
				<PieChart chartData={top10Tokens} />
			</LazyChart>
			<LazyChart style={{ minHeight: '320px' }}>
				<AreaChart chartData={historicalTreasury} title="Historical Treasury" valueSymbol="$" />
			</LazyChart>
			<LazyChart style={{ minHeight: '320px' }}>
				<AreaChart chartData={tokenBreakdown} title="Tokens Breakdown" stacks={tokensUnique} />
			</LazyChart>
			<LazyChart style={{ minHeight: '320px' }}>
				<AreaChart chartData={tokenBreakdownUSD} title="Tokens (USD)" stacks={tokensUnique} valueSymbol="$" />
			</LazyChart>
		</ChartsWrapper>
	)
}
