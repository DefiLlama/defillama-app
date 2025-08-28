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
	'protocols/[...category]',
	async ({
		params: {
			category: [category, chain]
		}
	}) => {
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const { categoriesAndTags } = metadataCache
		const categoryName = categoriesAndTags.categories.find((c) => slug(c) === slug(category))
		let tagName = null
		if (!categoryName) {
			tagName = categoriesAndTags.tags.find((t) => slug(t) === slug(category))
		}

		if (!categoryName && !tagName) {
			return {
				notFound: true
			}
		}

		const props = await getProtocolsByCategoryOrTag({ category: categoryName, tag: tagName, chain })

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
	const res = await fetchJson(PROTOCOLS_API)

	const paths = res.protocolCategories.map((category) => ({
		params: { category: [slug(category)] }
	}))

	return { paths, fallback: 'blocking' }
}

const toggleOptions = tvlOptions.filter((key) => !['doublecounted', 'liquidstaking'].includes(key.key))

export default function Protocols(props) {
	return (
		<Layout
			title={
				props.isRWA
					? `${capitalizeFirstLetter(props.category ?? props.tag)} Rankings - DefiLlama`
					: `${capitalizeFirstLetter(props.category ?? props.tag)} Protocols Rankings - DefiLlama`
			}
			includeInMetricsOptions={toggleOptions}
		>
			<ProtocolsByCategoryOrTag {...props} />
		</Layout>
	)
}
