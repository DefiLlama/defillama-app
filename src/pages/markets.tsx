import { useRouter } from 'next/router'
import * as React from 'react'
import { MarketsCategory } from '~/containers/Markets/MarketsCategory'
import { MarketsExchange } from '~/containers/Markets/MarketsExchange'
import { MarketsHome } from '~/containers/Markets/MarketsHome'
import { isSegment, type Segment } from '~/containers/Markets/segments'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'
import { getQueryValue, pushShallowQuery } from '~/utils/routerQuery'

type MarketsPageProps = {
	knownTokenSlugs: string[]
}

export const getStaticProps = withPerformanceLogging<MarketsPageProps>('markets', async () => {
	const metadataModule = await import('~/utils/metadata')

	return {
		props: {
			knownTokenSlugs: Object.keys(metadataModule.default.tokenDirectory)
		},
		revalidate: maxAgeForNext([22])
	}
})

function parseSegment(value: string | null): Segment {
	if (isSegment(value)) return value
	if (value === 'linear') return 'linear_perp'
	if (value === 'inverse') return 'inverse_perp'
	return 'spot'
}

export default function MarketsPage({ knownTokenSlugs }: MarketsPageProps) {
	const router = useRouter()
	const category = getQueryValue(router.query, 'category')
	const exchange = getQueryValue(router.query, 'exchange')
	const segment = parseSegment(getQueryValue(router.query, 'tab'))
	const knownTokenSlugSet = React.useMemo(() => new Set(knownTokenSlugs), [knownTokenSlugs])

	const onSegmentChange = (next: Segment) => {
		void pushShallowQuery(router, { tab: next })
	}

	return (
		<Layout
			title="Markets - DefiLlama"
			description="Spot and perpetual market metrics merged across exchanges: movers, open interest, funding, and sentiment by token and category."
			canonicalUrl="/markets"
		>
			{exchange ? (
				<MarketsExchange key={exchange} exchange={exchange} segment={segment} onSegmentChange={onSegmentChange} />
			) : category ? (
				<MarketsCategory
					key={category}
					tag={category}
					segment={segment}
					onSegmentChange={onSegmentChange}
					knownTokenSlugs={knownTokenSlugSet}
				/>
			) : (
				<MarketsHome segment={segment} onSegmentChange={onSegmentChange} knownTokenSlugs={knownTokenSlugSet} />
			)}
		</Layout>
	)
}
