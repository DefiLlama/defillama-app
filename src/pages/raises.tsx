import type { InferGetStaticPropsType } from 'next'
import RaisesContainer from '~/containers/Raises'
import { getRaisesPageData } from '~/containers/Raises/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Raises Overview']

export const getStaticProps = withPerformanceLogging('raises', async () => {
	const data = await getRaisesPageData()
	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const Raises = (props: InferGetStaticPropsType<typeof getStaticProps>) => {
	return (
		<Layout
			title="DeFi Funding Rounds & Crypto Raises - DefiLlama"
			description="Track DeFi and crypto funding rounds, venture capital investments, and investor activity. Monitor 1000+ funding rounds across 500+ protocols. Real-time Web3 investment analytics with investor profiles and funding amounts."
			canonicalUrl="/raises"
			pageName={pageName}
		>
			<RaisesContainer {...props} />
		</Layout>
	)
}

export default Raises
