import type { InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { ProtocolsWithTokens } from '~/containers/Protocols/ProtocolsWithTokens'
import { getProtocolsFDVsByChain } from '~/containers/Protocols/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`protocols-fdv/index`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const data = await getProtocolsFDVsByChain({ chain: 'All', protocolMetadata: metadataCache.protocolMetadata })

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', 'Fully Diluted Valuation']

export default function ProtocolsFdv(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="Fully Diluted Valuations - DefiLlama"
			description={`Fully Diluted Valuations by Protocol. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`fully diluted valuations, defi fully diluted valuations`}
			canonicalUrl={`/fdv`}
			pageName={pageName}
		>
			<ProtocolsWithTokens {...props} />
		</Layout>
	)
}
