import type { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { BorrowedProtocolsTVLByChain } from '~/containers/TotalBorrowed/BorrowedByChain'
import { getTotalBorrowedByChain } from '~/containers/TotalBorrowed/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticPaths = async () => {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
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

		const data = await getTotalBorrowedByChain({
			chain: metadataCache.chainMetadata[chain].name,
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

export default function TotalBorrowedByChain(props) {
	return (
		<Layout
			title="Total Borrowed - DefiLlama"
			description={`Total Borrowed by Protocol on ${props.chain}. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`total value borrowed by protocol on ${props.chain}`}
			canonicalUrl={`/total-borrowed/chain/${props.chain}`}
			pageName={pageName}
		>
			<BorrowedProtocolsTVLByChain {...props} />
		</Layout>
	)
}
