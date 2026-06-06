import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { tvlOptions } from '~/components/Filters/options'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { ProtocolTaxonomyPage } from '~/containers/ProtocolTaxonomy'
import { getProtocolCategoryPresentation } from '~/containers/ProtocolTaxonomy/constants'
import { getProtocolTaxonomyPageData } from '~/containers/ProtocolTaxonomy/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'protocols/[category]',
	async ({ params }: GetStaticPropsContext<{ category: string }>) => {
		if (!params?.category) {
			return { notFound: true }
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

		// `getProtocolTaxonomyPageData` is typed as a discriminated union:
		// - kind=category requires `category`
		// - kind=tag requires `tag` + `tagCategory`
		if (tagName && !tagCategory) {
			return { notFound: true }
		}

		const props = categoryName
			? await getProtocolTaxonomyPageData({
					kind: 'category',
					category: categoryName,
					chain,
					categoriesAndTags,
					chainMetadata: metadataCache.chainMetadata
				})
			: await getProtocolTaxonomyPageData({
					kind: 'tag',
					tag: tagName,
					tagCategory,
					chain,
					categoriesAndTags,
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
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const { getProtocolListingStaticPaths } = await import('~/server/routeCache/assets')
	const paths = await getProtocolListingStaticPaths()

	return { paths, fallback: 'blocking' }
}

const toggleOptions = tvlOptions.filter((key) => !['doublecounted', 'liquidstaking'].includes(key.key))

export default function Protocols(props: InferGetStaticPropsType<typeof getStaticProps>) {
	const categoryLabel = props.category ?? props.tag ?? ''
	const presentation = getProtocolCategoryPresentation({
		label: categoryLabel,
		effectiveCategory: props.effectiveCategory,
		isTagPage: !!props.tag && !props.category
	})
	const title = presentation.seoTitle
	const description = presentation.seoDescription
	return (
		<Layout
			title={title}
			description={description}
			canonicalUrl={`/protocols/${props.category ? props.category : props.tag}`}
			metricFilters={toggleOptions}
		>
			<ProtocolTaxonomyPage {...props} />
		</Layout>
	)
}
