import { maxAgeForNext } from '~/api'
import { FDVsByChain } from '~/containers/ProtocolFDVs/FDVsByChain'
import { getProtocolsFDVsByChain } from '~/containers/ProtocolFDVs/queries'
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
			<FDVsByChain {...props} />
		</Layout>
	)
}
