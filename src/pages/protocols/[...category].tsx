import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { PROTOCOLS_API } from '~/constants/index'
import { capitalizeFirstLetter, slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'
import { fetchJson } from '~/utils/async'
import { descriptions, tags } from '../categories'
import { ProtocolsByCategoryOrTag } from '~/containers/ProtocolsByCategoryOrTag'
import { getProtocolsByCategoryOrTag } from '~/containers/ProtocolsByCategoryOrTag/queries'

export const getStaticProps = withPerformanceLogging(
	'protocols/[...category]',
	async ({
		params: {
			category: [category, chain]
		}
	}) => {
		const categoryName = Object.entries(descriptions).find((d) => slug(d[0]) === slug(category))?.[0]
		const tagName = tags.find((t) => slug(t) === slug(category))

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

export default function Protocols(props) {
	return (
		<Layout title={`${capitalizeFirstLetter(props.category ?? props.tag)} TVL Rankings - DefiLlama`} defaultSEO>
			<ProtocolsByCategoryOrTag {...props} />
		</Layout>
	)
}
