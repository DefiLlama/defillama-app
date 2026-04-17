import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { DEFAULT_CHART_VIEW } from '~/containers/RWA/Perps/chartState'
import { RWAPerpsDashboard } from '~/containers/RWA/Perps/Dashboard'
import { getRWAPerpsVenuePage } from '~/containers/RWA/Perps/queries'
import { RWAPerpsTabNav } from '~/containers/RWA/Perps/TabNav'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export async function getStaticPaths() {
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	return {
		paths: metadataCache.rwaPerpsList.venues.slice(0, 10).map((venue) => ({ params: { venue: rwaSlug(venue) } })),
		fallback: 'blocking'
	}
}

export const getStaticProps = withPerformanceLogging(
	'rwa/perps/venue/[venue]',
	async ({ params }: GetStaticPropsContext<{ venue: string }>) => {
		if (!params?.venue) {
			return { notFound: true }
		}

		const data = await getRWAPerpsVenuePage({ venue: params.venue, activeView: DEFAULT_CHART_VIEW })
		if (!data) {
			return { notFound: true }
		}

		return {
			props: { data },
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['RWA Perps']

export default function RWAPerpsVenuePage({ data }: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={`${data.venue} RWA Perps Dashboard & Analytics - DefiLlama`}
			description={`Track ${data.venue} RWA perpetual markets by open interest, volume, market activity, and instrument-level breakdowns.`}
			pageName={pageName}
			canonicalUrl={`/rwa/perps/venue/${rwaSlug(data.venue)}`}
		>
			<RWAPerpsTabNav active="venues" />
			<RWAPerpsDashboard mode="venue" data={data} />
		</Layout>
	)
}
