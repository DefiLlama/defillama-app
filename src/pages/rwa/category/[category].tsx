import type { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { RWAOverview } from '~/containers/RWA'
import { getRWAAssetsOverview } from '~/containers/RWA/queries'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export async function getStaticPaths() {
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
			return { notFound: true, props: null }
		}

		const categorySlug = rwaSlug(params.category)

		let categoryExists = false
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const rwaList = metadataCache.rwaList
		for (const category of rwaList.categories) {
			if (rwaSlug(category) === categorySlug) {
				categoryExists = true
				break
			}
		}
		if (!categoryExists) {
			return { notFound: true, props: null }
		}

		const props = await getRWAAssetsOverview({ category: categorySlug })

		return {
			props,
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['RWA']

export default function RWAPage(props) {
	return (
		<Layout
			title="Real World Assets - DefiLlama"
			description={`Real World Assets on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`real world assets, defi rwa rankings, rwa on chain`}
			pageName={pageName}
			canonicalUrl={`/rwa/categories`}
		>
			<RWAOverview {...props} />
		</Layout>
	)
}
