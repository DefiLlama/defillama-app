import { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import GovernanceProject from '~/containers/Governance/GovernanceProject'
import { getGovernanceDetailsPageData } from '~/containers/Governance/queries'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { slug } from '~/utils'
import { IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'protocol/governance/[protocol]',
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

		if (!metadata || !metadata[1].governance) {
			return { notFound: true, props: null }
		}

		const protocolData = await getProtocol(protocol)
		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })
		const { props: governanceProps } = await getGovernanceDetailsPageData({
			governanceIDs: protocolData.governanceID ?? [],
			projectName: protocolData.name
		})

		return {
			props: {
				name: protocolData.name,
				symbol: protocolData.symbol ?? null,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				metrics,
				governanceData: governanceProps.governanceData,
				governanceTypes: governanceProps.governanceTypes,
				warningBanners: getProtocolWarningBanners(protocolData)
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
			tab="governance"
			warningBanners={props.warningBanners}
		>
			{props.governanceData?.length ? (
				<GovernanceProject
					projectName={props.name}
					governanceData={props.governanceData}
					governanceTypes={props.governanceTypes ?? []}
				/>
			) : null}
		</ProtocolOverviewLayout>
	)
}
