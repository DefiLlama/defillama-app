import { maxAgeForNext } from '~/api'
import { ProtocolsWithTokens } from '~/containers/ProtocolsWithTokens'
import { getProtocolsFDVsByChain } from '~/containers/ProtocolsWithTokens/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`protocols-fdv/index`, async () => {
	const data = await getProtocolsFDVsByChain({ chain: 'All' })

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export default function ProtocolsFdv(props) {
	return (
		<Layout title="Fully Diluted Valuations - DefiLlama">
			<ProtocolsWithTokens {...props} />
		</Layout>
	)
}
