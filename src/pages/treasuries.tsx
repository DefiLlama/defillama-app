import type { InferGetStaticPropsType } from 'next'
import { Treasuries } from '~/containers/Treasuries'
import { getTreasuryPageData } from '~/containers/Treasuries/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Projects', 'ranked by', 'Treasury']

export const getStaticProps = withPerformanceLogging('treasuries', async () => {
	const data = await getTreasuryPageData()
	return {
		props: { data, entity: false },
		revalidate: maxAgeForNext([22])
	}
})

export default function TreasuriesPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="DeFi Treasury Rankings - Protocol Holdings - DefiLlama"
			description="Track DAO and DeFi protocol treasury holdings. View treasury composition, stablecoin allocations, and native token reserves. Real-time treasury analytics for 500+ DeFi protocols and organizations."
			canonicalUrl="/treasuries"
			pageName={pageName}
		>
			<Treasuries {...props} />
		</Layout>
	)
}
