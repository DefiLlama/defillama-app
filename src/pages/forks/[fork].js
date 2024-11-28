import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { maxAgeForNext } from '~/api'
import { getForkPageData } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { ForkContainer } from '~/containers/Forks'

export const getStaticProps = withPerformanceLogging('fees/chains/index', async ({ params: { fork } }) => {
	const data = await getForkPageData(fork)

	return {
		...data,
		revalidate: maxAgeForNext([22])
	}
})

export async function getStaticPaths() {
	const { forks = {} } = await getForkPageData()

	const forksList = Object.keys(forks)

	const paths = forksList.slice(0, 10).map((fork) => {
		return {
			params: { fork }
		}
	})

	return { paths, fallback: 'blocking' }
}

export default function Forks(props) {
	return (
		<Layout title={`Forks - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch />

			<ForkContainer {...props} />
		</Layout>
	)
}
