import { ADAPTOR_TYPES, getOverviewItemPageData } from '~/api/categories/adaptors'
import { withPerformanceLogging } from '~/utils/perf'
import { ProtocolByAdapter } from '~/containers/DimensionAdapters/ProtocolByAdapter'
import { GetStaticPropsContext } from 'next'
import { slug } from '~/utils'
import metadataCache from '~/utils/metadata'
import { maxAgeForNext } from '~/api'
import { fetchWithErrorLogging } from '~/utils/async'
import { DIMENISIONS_OVERVIEW_API } from '~/constants'
const { chainMetadata, protocolMetadata } = metadataCache

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

		const metadata = Object.entries(protocolMetadata).find((p) => (p[1] as any).name === protocol)?.[1]

		if (!metadata?.[ADAPTOR_TYPE] && !chainMetadata[protocol]?.chainFees) {
			return { notFound: true, props: null }
		}

		const [feesData, bribesData, tokenTaxData] = await Promise.all([
			getOverviewItemPageData(ADAPTOR_TYPE, protocol).catch((e) =>
				console.info(`Item page data not found ${ADAPTOR_TYPE} ${protocol}`, e)
			),
			metadata?.bribeRevenue
				? getOverviewItemPageData(ADAPTOR_TYPE, protocol, 'dailyBribesRevenue').catch((e) =>
						console.info(`Item page data not found ${ADAPTOR_TYPE} ${protocol}`, e)
				  )
				: Promise.resolve(null),
			metadata?.tokenTax
				? getOverviewItemPageData(ADAPTOR_TYPE, protocol, 'dailyTokenTaxes').catch((e) =>
						console.info(`Item page data not found ${ADAPTOR_TYPE} ${protocol}`, e)
				  )
				: Promise.resolve(null)
		])

		if (!feesData || !feesData.name) return { notFound: true }

		const totalDataChart = {}
		for (const item of feesData.totalDataChart[0]) {
			totalDataChart[item.date] = {}
			for (const key of feesData.totalDataChart[1]) {
				totalDataChart[item.date][key] = item[key] || 0
			}
			if (bribesData) {
				totalDataChart[item.date].Bribes = bribesData.totalDataChart[0].find((i) => i.date === item.date)?.Bribes ?? 0
			}
			if (tokenTaxData) {
				totalDataChart[item.date].TokenTax =
					tokenTaxData.totalDataChart[0].find((i) => i.date === item.date)?.TokenTax ?? 0
			}
		}

		const finalChartData = []
		for (const date in totalDataChart) {
			finalChartData.push({
				date,
				...totalDataChart[date]
			})
		}

		return {
			props: {
				protocolSummary: {
					...feesData,
					totalDataChart: [finalChartData, feesData.totalDataChart[1]],
					type: ADAPTOR_TYPE,
					...(tokenTaxData ? { totalAllTimeTokenTaxes: tokenTaxData.totalAllTime } : {}),
					...(bribesData ? { totalAllTimeBribes: bribesData.totalAllTime } : {})
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
