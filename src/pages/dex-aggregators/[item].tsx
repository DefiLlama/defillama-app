import { ADAPTOR_TYPES, getDimensionProtocolPageData } from '~/api/categories/adaptors'
import { withPerformanceLogging } from '~/utils/perf'
import { ProtocolByAdapter } from '~/containers/DimensionAdapters/ProtocolByAdapter'
import { GetStaticPropsContext } from 'next'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/api'
import { fetchJson } from '~/utils/async'
import { DIMENISIONS_OVERVIEW_API } from '~/constants'
import { IProtocolMetadata } from '~/containers/ProtocolOverview/types'

const ADAPTOR_TYPE = ADAPTOR_TYPES.AGGREGATORS

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

	const protocols = await fetchJson(
		`${DIMENISIONS_OVERVIEW_API}/${ADAPTOR_TYPE}?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
	)
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
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const { protocolMetadata } = metadataCache
		let metadata: [string, IProtocolMetadata] | undefined
		for (const key in protocolMetadata) {
			if (protocolMetadata[key].name === protocol) {
				metadata = [key, protocolMetadata[key]]
				break
			}
		}

		if (!metadata || !metadata[1].dexAggregators) {
			return { notFound: true, props: null }
		}

		const data = await getDimensionProtocolPageData({ adapterType: ADAPTOR_TYPE, protocolName: protocol }).catch((e) =>
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
			metadata: metadata[1],
			revalidate: maxAgeForNext([22])
		}
	}
)

export default function ProtocolVolume(props) {
	return <ProtocolByAdapter {...props} type="volume" />
}
