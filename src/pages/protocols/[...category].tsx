import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { PROTOCOLS_API } from '~/constants/index'
import { capitalizeFirstLetter, slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'
import { fetchWithErrorLogging } from '~/utils/async'
import { descriptions } from '../categories'
import { ProtocolsByCategory } from '~/containers/ProtocolsByCategory'
import { getProtocolsByCategory } from '~/containers/ProtocolsByCategory/queries'

const fetch = fetchWithErrorLogging

export const getStaticProps = withPerformanceLogging(
	'protocols/[...category]',
	async ({
		params: {
			category: [category, chain]
		}
	}) => {
		const categoryName = Object.entries(descriptions).find((d) => slug(d[0]) === slug(category))?.[0]

		if (!categoryName) {
			return {
				notFound: true
			}
		}

		const props = await getProtocolsByCategory({ category: categoryName, chain })

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
	const res = await fetch(PROTOCOLS_API)

	const paths = (await res.json()).protocolCategories.map((category) => ({
		params: { category: [slug(category)] }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Protocols(props) {
	return (
		<Layout title={`${capitalizeFirstLetter(props.category)} TVL Rankings - DefiLlama`} defaultSEO>
			<ProtocolsByCategory {...props} />
		</Layout>
	)
}
