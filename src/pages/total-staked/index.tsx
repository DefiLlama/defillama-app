import { maxAgeForNext } from '~/api'
import { getTotalStakedByChain } from '~/containers/TotalStaked/queries'
import { StakedByChain } from '~/containers/TotalStaked/StakedByChain'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`total-staked/index`, async () => {
	const data = await getTotalStakedByChain({ chain: 'All' })

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export default function TotalBorrowed(props) {
	return (
		<Layout title="Total Staked - DefiLlama">
			<StakedByChain {...props} />
		</Layout>
	)
}
