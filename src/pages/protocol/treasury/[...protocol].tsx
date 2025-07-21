import { withPerformanceLogging } from '~/utils/perf'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { TreasuryChart } from '~/containers/ProtocolOverview/Treasury'
import { maxAgeForNext } from '~/api'
import { slug } from '~/utils'
import { IProtocolMetadata } from '~/containers/ProtocolOverview/types'

export const getStaticProps = withPerformanceLogging(
	'protocol/treasury[...protocol]',
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
			if (protocolMetadata[key].name === normalizedName) {
				metadata = [key, protocolMetadata[key]]
				break
			}
		}

		if (!metadata || !metadata[1].treasury) {
			return { notFound: true, props: null }
		}

		const protocolData = await getProtocol(protocol)

		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				metrics
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
			tab="treasury"
			toggleOptions={[]}
		>
			<div className="col-span-full flex flex-col gap-2 bg-(--cards-bg) border border-(--cards-border) rounded-md p-2 xl:p-4">
				<h2 className="relative group text-base font-semibold flex items-center gap-1" id="treasury">
					Treasury for {props.name}
				</h2>
			</div>
			<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md">
				<TreasuryChart protocolName={props.name} />
			</div>
		</ProtocolOverviewLayout>
	)
}
