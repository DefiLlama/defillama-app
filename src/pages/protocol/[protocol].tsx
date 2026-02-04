import type { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { PROTOCOLS_API } from '~/constants'
import { ProtocolOverview } from '~/containers/ProtocolOverview'
import { getProtocolOverviewPageData } from '~/containers/ProtocolOverview/queries'
import { IProtocolOverviewPageData } from '~/containers/ProtocolOverview/types'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'protocol/[protocol]',
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

		if (!metadata) {
			return { notFound: true, props: null }
		}

		const data = await getProtocolOverviewPageData({
			protocolId: metadata[0],
			currentProtocolMetadata: metadata[1],
			chainMetadata: metadataCache.chainMetadata
		})

		if (!data) {
			return { notFound: true, props: null }
		}

		return { props: data, revalidate: maxAgeForNext([22]) }
	}
)

export async function getStaticPaths() {
	const res = await fetchJson(PROTOCOLS_API)
	const slugs = new Set()
	const excludeCategories = new Set(['Bridge', 'Canonical Bridge'])
	for (const protocol of res.protocols) {
		if (excludeCategories.has(protocol.category ?? '')) {
			continue
		}
		if (protocol.name.startsWith('Uniswap')) {
			slugs.add(slug(protocol.name))
		}
		if (protocol.parentProtocol) {
			slugs.add(slug(protocol.parentProtocol.replace('parent#', '')))
		} else {
			slugs.add(slug(protocol.name))
		}
		if (slugs.size >= 35) {
			break
		}
	}
	const paths: string[] = Array.from(slugs).map((slug) => `/protocol/${slug}`)

	return { paths, fallback: 'blocking' }
}

export default function Protocols(props: IProtocolOverviewPageData) {
	return <ProtocolOverview {...props} />
}
