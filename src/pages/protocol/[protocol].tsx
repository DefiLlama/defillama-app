import type { GetStaticPropsContext } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { fetchEntityQuestions } from '~/containers/LlamaAI/api'
import { ProtocolOverview } from '~/containers/ProtocolOverview'
import { getProtocolOverviewPageData } from '~/containers/ProtocolOverview/queries'
import type { IProtocolOverviewPageData } from '~/containers/ProtocolOverview/types'
import { fetchProtocols } from '~/containers/Protocols/api'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import type { IProtocolMetadata } from '~/utils/metadata/types'
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
			chainMetadata: metadataCache.chainMetadata,
			tokenlist: metadataCache.tokenlist,
			cgExchangeIdentifiers: metadataCache.cgExchangeIdentifiers
		})

		if (!data) {
			return { notFound: true, props: null }
		}

		const { questions: entityQuestions } = await fetchEntityQuestions(normalizedName, 'protocol')

		return { props: { ...data, entityQuestions }, revalidate: maxAgeForNext([22]) }
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

	const res = await fetchProtocols()
	const slugs = new Set()
	const excludeCategories = new Set(['Bridge', 'Canonical Bridge', 'Staking Pool'])
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
