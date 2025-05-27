import { maxAgeForNext } from '~/api'
import { NetProjectTreasuryByChain } from '~/containers/NetProjectTreasury/NetProjectTreasuryByChain'
import { getNetProjectTreasuryByChain } from '~/containers/NetProjectTreasury/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`net-project-treasury/index`, async () => {
	const data = await getNetProjectTreasuryByChain()

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const NetProjectTreasuries = (props) => {
	return (
		<Layout title={`Net Project Treasury - DefiLlama`} defaultSEO>
			<NetProjectTreasuryByChain {...props} />
		</Layout>
	)
}

export default NetProjectTreasuries
