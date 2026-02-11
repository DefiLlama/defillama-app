import type { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { fetchProtocolOverviewMetrics } from '~/containers/ProtocolOverview/api'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocolMetricFlags } from '~/containers/ProtocolOverview/queries'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { UnlocksCharts } from '~/containers/Unlocks/EmissionsByProtocol'
import { getProtocolUnlocksStaticPropsData } from '~/containers/Unlocks/protocolUnlocksStaticProps'
import { slug } from '~/utils'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'protocol/unlocks/[protocol]',
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

		if (!metadata || !metadata[1].emissions) {
			return { notFound: true, props: null }
		}

		const protocolData = await fetchProtocolOverviewMetrics(protocol)

		const metrics = getProtocolMetricFlags({ protocolData, metadata: metadata[1] })

		const { emissions, initialTokenMarketData } = await getProtocolUnlocksStaticPropsData(normalizedName)

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				metrics,
				warningBanners: getProtocolWarningBanners(protocolData),
				emissions,
				initialTokenMarketData
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Protocols(props) {
	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="unlocks"
			warningBanners={props.warningBanners}
		>
			<div className="flex flex-col gap-2 rounded-md">
				<UnlocksCharts
					protocolName={props.name}
					initialData={props.emissions}
					initialTokenMarketData={props.initialTokenMarketData}
					disableClientTokenStatsFetch
					isEmissionsPage
				/>
			</div>
		</ProtocolOverviewLayout>
	)
}
