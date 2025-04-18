import { ADAPTOR_TYPES, getOverviewItemPageData } from '~/api/categories/adaptors'
import { withPerformanceLogging } from '~/utils/perf'
import { ProtocolByAdapter } from '~/containers/DimensionAdapters/ProtocolByAdapter'
import { GetStaticPropsContext } from 'next'
import { slug } from '~/utils'
import metadataCache from '~/utils/metadata'
import { maxAgeForNext } from '~/api'
import { fetchWithErrorLogging } from '~/utils/async'
import { DIMENISIONS_OVERVIEW_API } from '~/constants'
const protocolMetadata = metadataCache.protocolMetadata

const ADAPTOR_TYPE = ADAPTOR_TYPES.BRIDGE_AGGREGATORS

export const getStaticPaths = async () => {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (process.env.SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const protocols = await fetchWithErrorLogging(
		`${DIMENISIONS_OVERVIEW_API}/${ADAPTOR_TYPE}?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
	)
		.then((res) => res.json())
		.then((res) => (res.protocols ?? []).sort((a, b) => (b.total24h ?? 0) - (a.total24h ?? 0)).slice(0, 20))
		.catch(() => [])

	const paths = []
	for (const item of protocols) {
		paths.push({ params: { item: item.slug } })
		if (item.linkedProtocols?.[0]) {
			paths.push({ params: { item: slug(item.linkedProtocols[0]) } })
		}
	}

	return { paths, fallback: 'blocking' }
}

export const getStaticProps = withPerformanceLogging(
	`${ADAPTOR_TYPE}/[item]`,
	async ({ params }: GetStaticPropsContext<{ item: string }>) => {
		const protocol = slug(params.item)

		const metadata = Object.entries(protocolMetadata).find((p) => (p[1] as any).name === protocol)

		if (!metadata[1]?.['bridgeAggregators']) {
			return { notFound: true, props: null }
		}

		const data = await getOverviewItemPageData(ADAPTOR_TYPE, protocol).catch((e) =>
			console.info(`Item page data not found ${ADAPTOR_TYPE} ${protocol}`, e)
		)

		if (!data || !data.name) return { notFound: true }

		return {
			props: {
				protocolSummary: {
					...data,
					type: ADAPTOR_TYPE
				},
				title: `${data.name} Volume - DefiLlama`
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export default function ProtocolVolume(props) {
	return <ProtocolByAdapter {...props} type="volume" />
}
