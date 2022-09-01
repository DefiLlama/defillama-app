import { InferGetStaticPropsType } from 'next'
import { revalidate } from '~/api'
import Layout from '~/layout'
import dynamic from 'next/dynamic'
import { ProtocolDetails, ProtocolName, Stats, Tvl, TvlWrapper } from '~/containers/DexContainer'
import TokenLogo from '~/components/TokenLogo'
import FormattedName from '~/components/FormattedName'
import { formattedNum } from '~/utils'
import { IBarChartProps } from '~/components/ECharts/types'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

export const getStaticProps = async ({
	params: {
		protocol
	}
}) => {
	const data = await fetch(`https://fees.llama.fi/fees/${protocol}`).then(r=>r.json())
  const chart = data.feesHistory.map(t=>[t.timestamp, Object.values(t.dailyFees).reduce((sum:number, curr:number)=>curr[data.adapterKey]+sum, 0)])

	return {
		props: {
			data,
      chart
		},
		revalidate: revalidate()
	}
}

export async function getStaticPaths() {
	return { paths:[], fallback: 'blocking' }
}

export default function FeeProtocol({ data, chart }: InferGetStaticPropsType<typeof getStaticProps>) {
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

				<BarChart
					chartData={chart}
          title=""
				/>
			</Stats>
      </Layout>
}
