import { maxAgeForNext } from '~/api'
import { getNFTRoyaltyHistory } from '~/api/categories/nfts'
import Layout from '~/layout'
import { StatsSection } from '~/layout/Stats/Medium'
import { withPerformanceLogging } from '~/utils/perf'
import { DetailsWrapper, Name, ChartWrapper, ChartsWrapper, LazyChart, Button } from '~/layout/ProtocolAndPool'
import TokenLogo from '~/components/TokenLogo'
import FormattedName from '~/components/FormattedName'
import { Stat } from '~/layout/Stats/Large'
import dynamic from 'next/dynamic'
import { IBarChartProps } from '~/components/ECharts/types'
import { formattedNum } from '~/utils'
import { ProtocolChart } from '~/containers/DexsAndFees/charts/ProtocolChart'

export const getStaticProps = withPerformanceLogging(
	'nfts/royalties/[...collection]',
	async ({
		params: {
			collection: [slug]
		}
	}) => {
		if (!slug.startsWith('0x')) {
			return {
				notFound: true
			}
		}

		const data = await getNFTRoyaltyHistory(slug)

		return {
			props: data.royaltyHistory[0],
			revalidate: 3600
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

export default function Collection(props) {
	return (
		<Layout title={props.name + ' Royalties - DefiLlama'}>
			<StatsSection>
				<DetailsWrapper>
					<Name>
						<TokenLogo logo={props.logo} size={48} />
						<FormattedName text={props.name} fontWeight={700} />
					</Name>

					<Stat>
						<span>30d royalty earnings</span>
						<span>{formattedNum(props.total30d, true)}</span>
					</Stat>

					<Stat>
						<span>Lifetime royalty earnings</span>
						<span>{formattedNum(props.totalAllTime, true)}</span>
					</Stat>
				</DetailsWrapper>

				<ProtocolChart
					logo={props.logo}
					data={props}
					chartData={[props.totalDataChart.map((t) => ({ date: t[0], royalties: t[1] })), ['royalties']]}
					name={props.name}
					type={'Fees'}
					fullChart={true}
				/>
			</StatsSection>
		</Layout>
	)
}
