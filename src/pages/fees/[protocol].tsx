import { InferGetStaticPropsType } from 'next'
import { revalidate } from '~/api'
import Layout from '~/layout'
import dynamic from 'next/dynamic'
import { ProtocolDetails, ProtocolName, Stats, Tvl, TvlWrapper } from '~/containers/DexContainer'
import TokenLogo from '~/components/TokenLogo'
import FormattedName from '~/components/FormattedName'
import { formattedNum } from '~/utils'
import { IStackedBarChartProps } from '~/components/ECharts/BarChart/Stacked'
import { BreakpointPanel } from '~/components'

const StackedChart = dynamic(() => import('~/components/ECharts/BarChart/Stacked'), {
	ssr: false
}) as React.FC<IStackedBarChartProps>

const mapProtocolName = (protocolName: string) => {
	if (protocolName === 'trader-joe') {
		return 'traderjoe'
	} else if (protocolName === 'aave') {
		return 'AAVE'
	}
	return protocolName
}

export const getStaticProps = async ({
	params: {
		protocol
	}
}) => {
	const data = await fetch(`https://fees.llama.fi/fees/${mapProtocolName(protocol)}`).then(r=>r.json())
  	const feesData = data.feesHistory.map(t => [
		new Date(t.timestamp * 1000).toISOString(), 
		Object.values(t.dailyFees).reduce(
			(sum:number, curr:number) => Object.values(curr).reduce((item1: number, item2: number) => item1 + item2, 0) + sum, 0)])
  	const revenueData = data.revenueHistory.map(t => [
		new Date(t.timestamp * 1000).toISOString(), 
		Object.values(t.dailyRevenue).reduce(
			(sum:number, curr:number) => Object.values(curr).reduce((item1: number, item2: number) => item1 + item2, 0) + sum, 0)])

	let chartData = [
		{ name: "Fees", data: feesData },
		{ name: "Revenue", data: revenueData },
	]

	return {
		props: {
			data: { ...data, name: mapProtocolName(protocol) },
			chartData
		},
		revalidate: revalidate()
	}
}

export async function getStaticPaths() {
	return { paths:[], fallback: 'blocking' }
}

export default function FeeProtocol({ data, chartData }: InferGetStaticPropsType<typeof getStaticProps>) {
	return <Layout title={`${data.name} Fees - DefiLlama`} style={{ gap: '36px' }}>
  		<Stats>
			<ProtocolDetails style={{ borderTopLeftRadius: '12px' }}>
				<ProtocolName>
					<TokenLogo logo={data.logo} size={24} />
					<FormattedName text={data.name} maxCharacters={16} fontWeight={700} />
				</ProtocolName>

				<TvlWrapper>
					<Tvl>
						<span>24h fees</span>
						<span>{formattedNum(data.total1dFees || 0, true)}</span>
					</Tvl>
				</TvlWrapper>
				<TvlWrapper>
					<Tvl>
						<span>24h protocol revenue</span>
						<span>{formattedNum(data.total1dRevenue || 0, true)}</span>
					</Tvl>
				</TvlWrapper>
			</ProtocolDetails>

			<BreakpointPanel id="chartWrapper">
				<StackedChart
					chartData={chartData}
					title="Fees And Revenue"
				/>
			</BreakpointPanel>
		</Stats>

{/* 
		<BreakpointPanel id="chartWrapper">
					<RowFixed>
						{DENOMINATIONS.map((option) => (
							<OptionButton
								active={denomination === option}
								onClick={() => updateRoute(option)}
								style={{ margin: '0 8px 8px 0' }}
								key={option}
							>
								{option}
							</OptionButton>
						))}
					</RowFixed>
					{(
						<Chart
							display="liquidity"
							dailyData={finalChartData}
							unit={denomination}
							totalLiquidity={totalVolume}
							liquidityChange={volumeChangeUSD}
						/>
					)}
				</BreakpointPanel> */}
	</Layout>
}
