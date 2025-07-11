import { ADAPTOR_TYPES, getDimensionProtocolPageData } from '~/api/categories/adaptors'
import { withPerformanceLogging } from '~/utils/perf'
import { ProtocolByAdapter } from '~/containers/DimensionAdapters/ProtocolByAdapter'
import { GetStaticPropsContext } from 'next'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/api'
import { fetchJson } from '~/utils/async'
import { DIMENISIONS_OVERVIEW_API } from '~/constants'
import { IProtocolMetadata } from '~/containers/ProtocolOverview/types'
import { IChainMetadata } from '~/containers/ChainOverview/types'

const ADAPTOR_TYPE = ADAPTOR_TYPES.FEES

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

		let pmetadata: [string, IProtocolMetadata] | undefined
		for (const key in metadataCache.protocolMetadata) {
			if (metadataCache.protocolMetadata[key].name === protocol) {
				pmetadata = [key, metadataCache.protocolMetadata[key]]
				break
			}
		}

		let cmetadata: IChainMetadata
		if (!pmetadata) {
			cmetadata = metadataCache.chainMetadata[protocol]
		}

		if (!pmetadata?.[1]?.[ADAPTOR_TYPE] && !cmetadata?.chainFees) {
			return { notFound: true, props: null }
		}

		const feesData = await getDimensionProtocolPageData({
			adapterType: ADAPTOR_TYPE,
			protocolName: protocol,
			metadata: pmetadata?.[1] ?? cmetadata
		}).catch((e) => console.info(`Item page data not found ${ADAPTOR_TYPE} ${protocol}`, e))

		if (!feesData || !feesData.name) return { notFound: true }

		return {
			props: {
				protocolSummary: {
					...feesData,
					type: ADAPTOR_TYPE
				},
				title: `${feesData.name} Fees - DefiLlama`
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export default function ProtocolFees(props) {
	return <ProtocolByAdapter {...props} />
}
