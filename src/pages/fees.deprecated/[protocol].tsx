import * as React from 'react'
import { InferGetStaticPropsType } from 'next'
import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search'
import { revalidate } from '~/api'
import { capitalizeFirstLetter } from '~/utils'
import { mapProtocolName } from '~/api/categories/fees/client'
import { FeesBody } from '~/containers/Defi/Protocol'

export const getStaticProps = async ({ params: { protocol } }) => {
	const data = await fetch(`https://fees.llama.fi/fees/${mapProtocolName(protocol)}`).then((r) => r.json())

	const chartData = {}
	if (data.feesHistory && data.revenueHistory) {
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
	}

	return {
		props: {
			data: { ...data, name: capitalizeFirstLetter(mapProtocolName(protocol)) },
			chartData: Object.keys(chartData).map((date) => ({ date, ...chartData[date] }))
		},
		revalidate: revalidate()
	}
}

export type IFeesProps = Awaited<ReturnType<typeof getStaticProps>>

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function FeeProtocol({ data, chartData }: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout title={`${data.name} Fees - DefiLlama`} style={{ gap: '36px' }}>
			<ProtocolsChainsSearch step={{ category: 'Fees', name: data.name, hideOptions: true }} />
			<FeesBody data={data} chartData={chartData} />

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
