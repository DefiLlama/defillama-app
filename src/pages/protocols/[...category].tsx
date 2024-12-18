import Layout from '~/layout'
import { ProtocolList } from '~/containers/ProtocolList'
import { maxAgeForNext } from '~/api'
import { getProtocolsPageData } from '~/api/categories/protocols'
import { PROTOCOLS_API } from '~/constants/index'
import { capitalizeFirstLetter, slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

import { fetchWithErrorLogging } from '~/utils/async'
import { descriptions } from '../categories'

const fetch = fetchWithErrorLogging

export const getStaticProps = withPerformanceLogging(
	'protocols/[...category]',
	async ({
		params: {
			category: [category, chain]
		}
	}) => {
		const categoryName = Object.entries(descriptions).find((d) => slug(d[0]) === slug(category))

		if (!categoryName) {
			return {
				notFound: true
			}
		}

		const props = await getProtocolsPageData(categoryName[0], chain)

		if (props.filteredProtocols.length === 0) {
			return {
				notFound: true
			}
		}
		return {
			props,
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	const res = await fetch(PROTOCOLS_API)

	const paths = (await res.json()).protocolCategories.slice(0, 10).map((category) => ({
		params: { category: [category.toLowerCase()] }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Protocols({ category, ...props }) {
	return (
		<Layout title={`${capitalizeFirstLetter(category)} TVL Rankings - DefiLlama`} defaultSEO>
			<ProtocolList category={capitalizeFirstLetter(category)} {...props} csvDownload={true} />
		</Layout>
	)
}
