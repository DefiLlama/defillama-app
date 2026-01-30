import type { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { RWAOverview } from '~/containers/RWA'
import { getRWAAssetsOverview, getRWACategoriesList } from '~/containers/RWA/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export async function getStaticPaths() {
	const categories = await getRWACategoriesList()

	return {
		paths: categories.map((category) => ({ params: { category } })),
		fallback: false
	}
}

export const getStaticProps = withPerformanceLogging(
	`rwa/category/[category]`,
	async ({ params }: GetStaticPropsContext<{ category: string }>) => {
		if (!params?.category) {
			return { notFound: true, props: null }
		}

		const categorySlug = params.category
		const props = await getRWAAssetsOverview({ category: categorySlug })

		if (!props) return { notFound: true }

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
