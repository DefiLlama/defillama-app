import { maxAgeForNext } from '~/api'
import { getForkPageData } from '~/containers/Forks/queries'
import { withPerformanceLogging } from '~/utils/perf'
import { ForksByProtocol } from '~/containers/Forks'

export const getStaticProps = withPerformanceLogging('forks', async ({ params: { fork } }) => {
	const data = await getForkPageData(fork)

	return {
		props: { ...data },
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
			{tokenLinks?.length > 0 && (
				<RowLinksWithDropdown links={tokenLinks} activeLink={token} alternativeOthersText="Others" />
			)}
			<ForksByProtocol {...props} />
		</Layout>
	)
}
