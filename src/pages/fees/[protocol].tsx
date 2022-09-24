import * as React from 'react'
import { InferGetStaticPropsType } from 'next'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import { DetailsWrapper, Name, ChartWrapper } from '~/layout/ProtocolAndPool'
import { StatsSection } from '~/layout/Stats/Medium'
import { Stat } from '~/layout/Stats/Large'
import TokenLogo from '~/components/TokenLogo'
import FormattedName from '~/components/FormattedName'
import { ProtocolsChainsSearch } from '~/components/Search'
import { revalidate } from '~/api'
import { capitalizeFirstLetter, chainIconUrl, formattedNum } from '~/utils'
import type { IBarChartProps } from '~/components/ECharts/types'

const StackedChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

const mapProtocolName = (protocolName: string) => {
	if (protocolName === 'trader-joe') {
		return 'traderjoe'
	} else if (protocolName === 'aave') {
		return 'AAVE'
	}
	return protocolName
}

export const getStaticProps = async ({ params: { protocol } }) => {
	const data = await fetch(`https://fees.llama.fi/fees/${mapProtocolName(protocol)}`).then((r) => r.json())

	const chartData = {}

	data.feesHistory.forEach((item) => {
		if (!chartData[item.timestamp]) {
			chartData[item.timestamp] = {}
		}

		chartData[item.timestamp] = {
			...chartData[item.timestamp],
			Fees: Object.values(item.dailyFees).reduce(
				(sum: number, curr: number) =>
					Object.values(curr).reduce((item1: number, item2: number) => item1 + item2, 0) + sum,
				0
			)
		}
	})

	data.revenueHistory.forEach((item) => {
		if (!chartData[item.timestamp]) {
			chartData[item.timestamp] = {}
		}

		chartData[item.timestamp] = {
			...chartData[item.timestamp],
			Revenue: Object.values(item.dailyRevenue).reduce(
				(sum: number, curr: number) =>
					Object.values(curr).reduce((item1: number, item2: number) => item1 + item2, 0) + sum,
				0
			)
		}
	})

	return {
		props: {
			data: { ...data, name: capitalizeFirstLetter(mapProtocolName(protocol)) },
			chartData: Object.keys(chartData).map((date) => ({ date, ...chartData[date] }))
		},
		revalidate: revalidate()
	}
}

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function FeeProtocol({ data, chartData }: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout title={`${data.name} Fees - DefiLlama`} style={{ gap: '36px' }}>
			<ProtocolsChainsSearch step={{ category: 'Fees', name: data.name, hideOptions: true }} />

			<StatsSection>
				<DetailsWrapper>
					<Name>
						<TokenLogo logo={data.logo ?? chainIconUrl(data.name)} size={24} />
						<FormattedName text={data.name} maxCharacters={16} fontWeight={700} />
					</Name>

					<Stat>
						<span>24h fees</span>
						<span>{formattedNum(data.total1dFees || 0, true)}</span>
					</Stat>

					<Stat>
						<span>24h fees</span>
						<span>{formattedNum(data.total1dFees || 0, true)}</span>
					</Stat>
				</DetailsWrapper>

				<ChartWrapper>
					<StackedChart
						chartData={chartData}
						title="Fees And Revenue"
						stacks={{ Fees: 'a', Revenue: 'a' }}
						stackColors={stackedBarChartColors}
					/>
				</ChartWrapper>
			</StatsSection>

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
	)
}

const stackedBarChartColors = {
	Fees: '#4f8fea',
	Revenue: '#E59421'
}
