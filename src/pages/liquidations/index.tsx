import type { InferGetStaticPropsType } from 'next'
import { LiquidationsOverview } from '~/containers/LiquidationsV2'
import type { LiquidationsOverviewPageProps } from '~/containers/LiquidationsV2/api.types'
import { getLiquidationsOverviewPageData } from '~/containers/LiquidationsV2/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'liquidations/index',
	async (): Promise<{
		props: LiquidationsOverviewPageProps
		revalidate: number
	}> => {
		return {
			props: await getLiquidationsOverviewPageData(),
			revalidate: maxAgeForNext([22])
		}
	}
)

export default function LiquidationsOverviewPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="DeFi Liquidations Dashboard - DefiLlama"
			description="Track the latest liquidation positions across DeFi lending protocols and chains."
			canonicalUrl="/liquidations"
			pageName={['Liquidations']}
		>
			<LiquidationsOverview {...props} />
		</Layout>
	)
}
