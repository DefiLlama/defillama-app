import type { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { tvlOptions } from '~/components/Filters/options'
import { PROTOCOLS_API } from '~/constants/index'
import { ProtocolsByCategoryOrTag } from '~/containers/ProtocolsByCategoryOrTag'
import { getProtocolsByCategoryOrTag } from '~/containers/ProtocolsByCategoryOrTag/queries'
import Layout from '~/layout'
import { capitalizeFirstLetter, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'protocols/[category]',
	async ({ params }: GetStaticPropsContext<{ category: string }>) => {
		if (!params?.category) {
			return { notFound: true, props: null }
		}

		const category = params.category
		const chain = undefined

		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const { categoriesAndTags } = metadataCache
		const categoryName = categoriesAndTags.categories.find((c) => slug(c) === slug(category))
		let tagName = null
		let tagCategory = null
		if (!categoryName) {
			tagName = categoriesAndTags.tags.find((t) => slug(t) === slug(category))
			tagCategory = categoriesAndTags.tagCategoryMap[tagName]
		}

		if (!categoryName && !tagName) {
			return {
				notFound: true
			}
		}

		// `getProtocolsByCategoryOrTag` is typed as a discriminated union:
		// - kind=category requires `category`
		// - kind=tag requires `tag` + `tagCategory`
		if (tagName && !tagCategory) {
			return { notFound: true }
		}

		const props = categoryName
			? await getProtocolsByCategoryOrTag({
					kind: 'category',
					category: categoryName,
					chain,
					chainMetadata: metadataCache.chainMetadata
				})
			: await getProtocolsByCategoryOrTag({
					kind: 'tag',
					tag: tagName,
					tagCategory,
					chain,
					chainMetadata: metadataCache.chainMetadata
				})

		if (!props)
			return {
				notFound: true
			}

		return {
			props,
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (process.env.SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const res = await fetchJson(PROTOCOLS_API)

	const paths = res.protocolCategories.map((category) => ({
		params: { category: slug(category) }
	}))

	return { paths, fallback: 'blocking' }
}

const toggleOptions = tvlOptions.filter((key) => !['doublecounted', 'liquidstaking'].includes(key.key))

export default function Protocols(props) {
	const categoryLabel = props.category ?? props.tag ?? ''
	const displayCategoryLabel =
		props.effectiveCategory === 'RWA' && props.category ? 'Real World Assets on Chain (RWA)' : categoryLabel
	const titleLabel = props.effectiveCategory === 'RWA' ? displayCategoryLabel : categoryLabel
	const titleSuffix = props.effectiveCategory === 'RWA' ? 'Rankings' : 'Protocols Rankings'
	const title = `${capitalizeFirstLetter(titleLabel)} ${titleSuffix} - DefiLlama`
	const description = `${displayCategoryLabel} Rankings on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`
	const keywords = `${displayCategoryLabel} rankings, defi ${displayCategoryLabel} rankings`.toLowerCase()
	return (
		<Layout
			title={title}
			description={description}
			keywords={keywords}
			canonicalUrl={`/protocols/${props.category ? props.category : props.tag}`}
			metricFilters={toggleOptions}
		>
			<ProtocolsByCategoryOrTag {...props} />
		</Layout>
	)
}
