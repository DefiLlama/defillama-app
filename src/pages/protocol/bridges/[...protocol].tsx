import { maxAgeForNext } from '~/api'
import { BridgeContainerOnClient } from '~/containers/Bridges/BridgeProtocolOverview'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { IProtocolMetadata } from '~/containers/ProtocolOverview/types'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'protocol/bridges/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
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

		const protocolData = await getProtocol(protocol)

		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				metrics,
				warningBanners: getProtocolWarningBanners(protocolData)
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Protocols({ clientSide, protocolData, ...props }) {
	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="bridges"
			warningBanners={props.warningBanners}
			toggleOptions={[]}
		>
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<BridgeContainerOnClient protocol={props.name} />
			</div>
		</ProtocolOverviewLayout>
	)
}
