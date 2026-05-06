import type { GetStaticPropsContext } from 'next'
import * as React from 'react'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { CexMarketsSection } from '~/containers/Cexs/CexMarketsSection'
import { fetchProtocolOverviewMetrics } from '~/containers/ProtocolOverview/api'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import type { IProtocolPageMetrics } from '~/containers/ProtocolOverview/types'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

interface CexMarketsPageProps {
	name: string
	otherProtocols: string[]
	category: string | null
	metrics: IProtocolPageMetrics
	cexMarketsExchange: string
	cexMarketsSlug: string
}

const CEX_MARKETS_METRICS: IProtocolPageMetrics = {
	tvl: true,
	stablecoins: true,
	dexs: false,
	dexsNotionalVolume: false,
	perps: false,
	openInterest: false,
	optionsPremiumVolume: false,
	optionsNotionalVolume: false,
	dexAggregators: false,
	perpsAggregators: false,
	bridgeAggregators: false,
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
	newUsers: false,
	txCount: false,
	gasUsed: false,
	borrowed: false,
	tokenRights: false
}

export const getStaticProps = withPerformanceLogging(
	'cex/markets/[cex]',
	async ({ params }: GetStaticPropsContext<{ cex: string }>) => {
		if (!params?.cex) {
			return { notFound: true }
		}

		const exchangeName = params.cex
		const metadataModule = await import('~/utils/metadata')
		await metadataModule.refreshMetadataIfStale()
		const metadataCache = metadataModule.default
		const cexs = metadataCache.cexs

		const exchangeData = cexs.find(
			(cex) => cex.slug && (slug(cex.slug) === slug(exchangeName) || slug(cex.name) === slug(exchangeName))
		)

		if (!exchangeData) {
			return { notFound: true }
		}

		const { fetchExchangeMarketsListFromCache } = await import('~/server/datasetCache/markets')
		const exchangesList = await fetchExchangeMarketsListFromCache()
		const normalizedCexSlug = slug(exchangeData.slug ?? '')
		let cexMarketsExchange: string | null = null
		let cexMarketsSlug: string | null = null
		for (const entry of exchangesList.cex.spot) {
			if (entry.defillama_slug && slug(entry.defillama_slug) === normalizedCexSlug) {
				cexMarketsExchange = entry.exchange
				cexMarketsSlug = entry.defillama_slug
				break
			}
		}
		if (!cexMarketsExchange) {
			for (const entry of exchangesList.cex.linear_perp) {
				if (entry.defillama_slug && slug(entry.defillama_slug) === normalizedCexSlug) {
					cexMarketsExchange = entry.exchange
					cexMarketsSlug = entry.defillama_slug
					break
				}
			}
		}
		if (!cexMarketsExchange) {
			for (const entry of exchangesList.cex.inverse_perp) {
				if (entry.defillama_slug && slug(entry.defillama_slug) === normalizedCexSlug) {
					cexMarketsExchange = entry.exchange
					cexMarketsSlug = entry.defillama_slug
					break
				}
			}
		}

		if (!cexMarketsExchange || !cexMarketsSlug) {
			return { notFound: true }
		}

		const protocolData = await fetchProtocolOverviewMetrics(exchangeName)

		if (!protocolData) {
			return { notFound: true }
		}

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData.otherProtocols ?? [],
				category: protocolData.category ?? null,
				metrics: CEX_MARKETS_METRICS,
				cexMarketsExchange,
				cexMarketsSlug
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export const getStaticPaths = () => {
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	return { paths: [], fallback: 'blocking' }
}

export default function CexMarketsPage({
	name,
	otherProtocols,
	category,
	metrics,
	cexMarketsExchange,
	cexMarketsSlug
}: CexMarketsPageProps) {
	return (
		<ProtocolOverviewLayout
			isCEX
			name={name}
			category={category ?? ''}
			otherProtocols={otherProtocols}
			metrics={metrics}
			tab="markets"
			cexMarketsExchange={cexMarketsExchange}
			cexMarketsSlug={cexMarketsSlug}
			seoTitle={`${name} Markets - DefiLlama`}
			seoDescription={`Track ${name} spot and perpetual markets on DefiLlama.`}
		>
			<div className="grid grid-cols-1 gap-2">
				<CexMarketsSection exchange={cexMarketsExchange} name={name} />
			</div>
		</ProtocolOverviewLayout>
	)
}
