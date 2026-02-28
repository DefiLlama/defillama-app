import type { GetStaticPropsContext } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { fetchProtocolOverviewMetrics } from '~/containers/ProtocolOverview/api'
import type { IProtocolRaise } from '~/containers/ProtocolOverview/api.types'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocolMetricFlags } from '~/containers/ProtocolOverview/queries'
import type { IProtocolOverviewPageData, IProtocolPageMetrics } from '~/containers/ProtocolOverview/types'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { fetchTokenRightsData } from '~/containers/TokenRights/api'
import type { ITokenRightsData } from '~/containers/TokenRights/api.types'
import { TokenRightsByProtocol } from '~/containers/TokenRights/TokenRightsByProtocol'
import { findProtocolEntry, parseTokenRightsEntry } from '~/containers/TokenRights/utils'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

const EMPTY_OTHER_PROTOCOLS: string[] = []

type TokenRightsPageProps = {
	name: string
	symbol: string | null
	parentProtocol: string | null
	otherProtocols: string[]
	category: string | null
	metrics: IProtocolPageMetrics
	warningBanners: IProtocolOverviewPageData['warningBanners']
	toggleOptions: Array<{ name: string; key: string }>
	tokenRightsData: ITokenRightsData
	raises: IProtocolRaise[] | null
}

export const getStaticProps = withPerformanceLogging(
	'protocol/token-rights/[protocol]',
	async ({ params }: GetStaticPropsContext<{ protocol: string }>) => {
		if (!params?.protocol) {
			return { notFound: true, props: null }
		}

		const { protocol } = params
		const normalizedName = slug(protocol)
		const metadataModule = await import('~/utils/metadata')
		await metadataModule.refreshMetadataIfStale()
		const metadataCache = metadataModule.default
		const { protocolMetadata } = metadataCache

		let metadata: [string, IProtocolMetadata] | undefined
		for (const key in protocolMetadata) {
			if (slug(protocolMetadata[key].displayName) === normalizedName) {
				metadata = [key, protocolMetadata[key]]
				break
			}
		}

		if (!metadata || !metadata[1].tokenRights) {
			return { notFound: true, props: null }
		}

		const defillamaId = metadata[0]

		const [tokenRightsEntries, protocolData] = await Promise.all([
			fetchTokenRightsData(),
			fetchProtocolOverviewMetrics(protocol)
		])

		const rawEntry = findProtocolEntry(tokenRightsEntries, defillamaId)

		if (!rawEntry) {
			return { notFound: true, props: null }
		}

		const tokenRightsData = parseTokenRightsEntry(rawEntry)
		const raises = protocolData?.raises ? [...protocolData.raises].sort((a, b) => b.date - a.date) : null
		const symbol = protocolData?.gecko_id
			? (metadataCache.tokenlist[protocolData.gecko_id]?.symbol?.toUpperCase() ?? null)
			: protocolData?.symbol && protocolData.symbol !== '-'
				? protocolData.symbol
				: null

		const computedMetrics = protocolData ? getProtocolMetricFlags({ protocolData, metadata: metadata[1] }) : null
		const metrics: IProtocolPageMetrics = {
			...(computedMetrics ?? {
				tvl: false,
				dexs: false,
				perps: false,
				openInterest: false,
				optionsPremiumVolume: false,
				optionsNotionalVolume: false,
				dexAggregators: false,
				perpsAggregators: false,
				bridgeAggregators: false,
				stablecoins: false,
				bridge: false,
				treasury: false,
				unlocks: false,
				incentives: false,
				yields: false,
				fees: false,
				revenue: false,
				bribes: false,
				tokenTax: false,
				forks: false,
				governance: false,
				nfts: false,
				dev: false,
				inflows: false,
				liquidity: false,
				activeUsers: false,
				borrowed: false,
				tokenRights: false
			}),
			tokenRights: true
		}

		const props: TokenRightsPageProps = {
			name: protocolData?.name ?? rawEntry['Protocol Name'],
			symbol,
			parentProtocol: protocolData?.parentProtocol ?? null,
			otherProtocols: protocolData?.otherProtocols ?? EMPTY_OTHER_PROTOCOLS,
			category: protocolData?.category ?? null,
			metrics,
			warningBanners: protocolData ? getProtocolWarningBanners(protocolData) : [],
			toggleOptions: [],
			tokenRightsData,
			raises
		}

		return { props, revalidate: maxAgeForNext([22]) }
	}
)

export async function getStaticPaths() {
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	return { paths: [], fallback: 'blocking' }
}

export default function ProtocolTokenRightsPage(props: TokenRightsPageProps) {
	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category ?? ''}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="tokenRights"
			warningBanners={props.warningBanners}
			toggleOptions={props.toggleOptions}
		>
			<TokenRightsByProtocol
				name={props.name}
				symbol={props.symbol}
				tokenRightsData={props.tokenRightsData}
				raises={props.raises}
			/>
		</ProtocolOverviewLayout>
	)
}
