import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { tvlOptions } from '~/components/Filters/options'
import { getProtocolCategoryPresentation } from '~/containers/ProtocolsByCategoryOrTag/constants'
import { ProtocolsByCategoryOrTag } from '~/containers/ProtocolsByCategoryOrTag'
import { getProtocolsByCategoryOrTag } from '~/containers/ProtocolsByCategoryOrTag/queries'
import Layout from '~/layout'
import { capitalizeFirstLetter, slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'protocols/[category]/[chain]',
	async ({ params }: GetStaticPropsContext<{ category: string; chain: string }>) => {
		if (!params?.category || !params?.chain) {
			return { notFound: true, props: null }
		}

		const category = params.category
		const chain = params.chain

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

	return { paths: [], fallback: 'blocking' }
}

const toggleOptions = tvlOptions.filter((key) => !['doublecounted', 'liquidstaking'].includes(key.key))

export default function Protocols(props: InferGetStaticPropsType<typeof getStaticProps>) {
	const categoryLabel = props.category ?? props.tag ?? ''
	const presentation = getProtocolCategoryPresentation({
		label: categoryLabel,
		effectiveCategory: props.effectiveCategory,
		isTagPage: !!props.tag && !props.category
	})
	const title = `${capitalizeFirstLetter(presentation.seoLabel)} ${presentation.titleSuffix} - DefiLlama`
	const description = `${presentation.seoLabel} Rankings on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`
	const keywords = `${presentation.seoLabel} rankings, defi ${presentation.seoLabel} rankings`.toLowerCase()
	const canonicalChainSuffix = props.chain ? `/${props.chain}` : ''
	return (
		<Layout
			title={title}
			description={description}
			keywords={keywords}
			canonicalUrl={`/protocols/${props.category ? props.category : props.tag}${canonicalChainSuffix}`}
			metricFilters={toggleOptions}
		>
			<ProtocolsByCategoryOrTag {...props} />
		</Layout>
	)
}
