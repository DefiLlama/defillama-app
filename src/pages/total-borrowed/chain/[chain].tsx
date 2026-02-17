import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { ExtraTvlByChain } from '~/containers/Protocols/ExtraTvlByChain'
import { getExtraTvlByChain } from '~/containers/Protocols/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticPaths = async () => {
	if (process.env.SKIP_BUILD_STATIC_GENERATION) {
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
	return (
		<Layout
			title="Total Borrowed - DefiLlama"
			description={`Total Borrowed by Protocol on ${props.chain}. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`total value borrowed by protocol on ${props.chain}`}
			canonicalUrl={`/total-borrowed/chain/${props.chain}`}
			pageName={pageName}
		>
			<ExtraTvlByChain {...props} />
		</Layout>
	)
}
