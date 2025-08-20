import { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { Pool2ProtocolsTVLByChain } from '~/containers/Pool2/Pool2ByChain'
import { getPool2TVLByChain } from '~/containers/Pool2/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticPaths = async () => {
	return { paths: [], fallback: 'blocking' }
}

export const getStaticProps = withPerformanceLogging(
	`pool2/chain/[chain]`,
	async ({ params }: GetStaticPropsContext<{ chain: string }>) => {
		const chain = slug(params.chain)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		if (!metadataCache.chainMetadata[chain]) {
			return { notFound: true }
		}

		const data = await getPool2TVLByChain({ chain: metadataCache.chainMetadata[chain].name })

		if (!data) return { notFound: true }

		return {
			props: data,
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['Protocols', 'ranked by', 'Pool2 TVL']

export default function Pool2TVLByChain(props) {
	return (
		<Layout title="Pool2 TVL - DefiLlama" pageName={pageName}>
			<Pool2ProtocolsTVLByChain {...props} />
		</Layout>
	)
}
