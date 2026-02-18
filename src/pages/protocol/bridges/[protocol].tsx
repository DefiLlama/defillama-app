import type { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { BridgeInfo } from '~/containers/Bridges/BridgeProtocolOverview'
import { getBridgePageDatanew } from '~/containers/Bridges/queries.server'
import { fetchProtocolOverviewMetrics } from '~/containers/ProtocolOverview/api'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocolMetricFlags } from '~/containers/ProtocolOverview/queries'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { slug } from '~/utils'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

const EMPTY_TOGGLE_OPTIONS = []

export const getStaticProps = withPerformanceLogging(
	'protocol/bridges/[protocol]',
	async ({ params }: GetStaticPropsContext<{ protocol: string }>) => {
		if (!params?.protocol) {
			return { notFound: true, props: null }
		}
		const { protocol } = params
		const normalizedName = slug(protocol)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const { protocolMetadata } = metadataCache
		let metadata: [string, IProtocolMetadata] | undefined
		for (const key in protocolMetadata) {
			if (slug(protocolMetadata[key].displayName) === normalizedName) {
				metadata = [key, protocolMetadata[key]]
				break
			}
		}

		if (!metadata || !metadata[1].bridge) {
			return { notFound: true, props: null }
		}

		const [protocolData, bridgeData] = await Promise.all([
			fetchProtocolOverviewMetrics(protocol),
			getBridgePageDatanew(protocol)
		])

		if (!bridgeData) {
			return { notFound: true, props: null }
		}

		const metrics = getProtocolMetricFlags({ protocolData, metadata: metadata[1] })

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				metrics,
				warningBanners: getProtocolWarningBanners(protocolData),
				bridgeData
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	return { paths: [], fallback: 'blocking' }
}

export default function Protocols({ bridgeData, ...props }) {
	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="bridges"
			warningBanners={props.warningBanners}
			toggleOptions={EMPTY_TOGGLE_OPTIONS}
		>
			<div className="flex flex-col gap-10 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
				<BridgeInfo {...bridgeData} />
			</div>
		</ProtocolOverviewLayout>
	)
}
