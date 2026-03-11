import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { RWAOverview } from '~/containers/RWA'
import { getRWAAssetsOverview } from '~/containers/RWA/queries'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export async function getStaticPaths() {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const rwaList = metadataCache.rwaList
	return {
		paths: rwaList.categories.slice(0, 10).map((category) => ({ params: { category: rwaSlug(category) } })),
		fallback: 'blocking'
	}
}

export const getStaticProps = withPerformanceLogging(
	`rwa/category/[category]`,
	async ({ params }: GetStaticPropsContext<{ category: string }>) => {
		if (!params?.category) {
			return { notFound: true }
		}

		const categorySlug = rwaSlug(params.category)

		let categoryName = null
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const rwaList = metadataCache.rwaList
		for (const category of rwaList.categories) {
			if (rwaSlug(category) === categorySlug) {
				categoryName = category
				break
			}
		}
		if (!categoryName) {
			return { notFound: true }
		}

		const props = await getRWAAssetsOverview({ category: categorySlug, rwaList })

		if (!props) {
			return { notFound: true }
		}

		return {
			props: { ...props, categoryName },
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['RWA']

export default function RWAPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={`${props.categoryName} RWA Dashboard & Analytics - DefiLlama`}
			description={`Overview of the ${props.categoryName} Real World Asset (RWA) category, a high-level economic classification of tokenized assets and financial products onchain.`}
			pageName={pageName}
			canonicalUrl={`/rwa/category/${props.categorySlug}`}
		>
			<RWAOverview {...props} />
		</Layout>
	)
}
