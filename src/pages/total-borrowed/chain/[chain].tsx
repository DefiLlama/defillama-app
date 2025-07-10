import { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { PROTOCOLS_API } from '~/constants'
import { BorrowedByChain } from '~/containers/TotalBorrowed/BorrowedByChain'
import { getTotalBorrowedByChain } from '~/containers/TotalBorrowed/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import metadataCache from '~/utils/metadata'
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

	const chains = await fetchJson(PROTOCOLS_API)
		.then((res) => (res.chains ?? []).slice(0, 10))
		.catch(() => [])

	const paths = []
	for (const chain of chains) {
		paths.push({ params: { chain: slug(chain) } })
	}

	return { paths, fallback: 'blocking' }
}

export const getStaticProps = withPerformanceLogging(
	`total-borrowed/chain/[chain]`,
	async ({ params }: GetStaticPropsContext<{ chain: string }>) => {
		const chain = slug(params.chain)

		if (!metadataCache.chainMetadata[chain]) {
			return { notFound: true }
		}

		const data = await getTotalBorrowedByChain({ chain: metadataCache.chainMetadata[chain].name })

		if (!data) return { notFound: true }

		return {
			props: data,
			revalidate: maxAgeForNext([22])
		}
	}
)

export default function TotalBorrowed(props) {
	return (
		<Layout title="Total Borrowed - DefiLlama">
			<BorrowedByChain {...props} />
		</Layout>
	)
}
