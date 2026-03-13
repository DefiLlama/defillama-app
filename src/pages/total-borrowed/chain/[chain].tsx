import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { ExtraTvlByChain } from '~/containers/Protocols/ExtraTvlByChain'
import { getExtraTvlByChain } from '~/containers/Protocols/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticPaths = () => {
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	return { paths: [], fallback: 'blocking' }
}

export const getStaticProps = withPerformanceLogging(
	`total-borrowed/chain/[chain]`,
	async ({ params }: GetStaticPropsContext<{ chain: string }>) => {
		const chain = slug(params.chain)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		if (!metadataCache.chainMetadata[chain]) {
			return { notFound: true }
		}

		const data = await getExtraTvlByChain({
			chain: metadataCache.chainMetadata[chain].name,
			metric: 'borrowed',
			protocolMetadata: metadataCache.protocolMetadata
		})

		if (!data) return { notFound: true }

		return {
			props: data,
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['Protocols', 'ranked by', 'Total Value Borrowed']

export default function TotalBorrowedByChain(props: InferGetStaticPropsType<typeof getStaticProps>) {
	console.log(props)
	return (
		<Layout
			title={`Total Borrowed in DeFi on ${props.chain} - DefiLlama`}
			description={`Track total value borrowed across DeFi lending protocols on ${props.chain}. Compare borrowed TVL by protocol on DefiLlama.`}
			canonicalUrl={`/total-borrowed/chain/${slug(props.chain)}`}
			pageName={pageName}
		>
			<ExtraTvlByChain {...props} />
		</Layout>
	)
}
