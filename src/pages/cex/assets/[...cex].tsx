import ProtocolContainer from '~/containers/ProtocolOverview/index-old'
import { maxAgeForNext } from '~/api'
import { fuseProtocolData } from '~/api/categories/protocols'
import { cexData } from '../../cexs'
import { withPerformanceLogging } from '~/utils/perf'
import { fetchArticles, getProtocol, getProtocolPageStyles } from '~/containers/ProtocolOverview/queries'

export const getStaticProps = withPerformanceLogging(
	'cex/assets/[...cex]',
	async ({
		params: {
			cex: [exchangeName]
		}
	}) => {
		// if cex is not string, return 404
		const exchangeData = cexData.find((cex) => cex.slug.toLowerCase() === exchangeName.toLowerCase())
		if (typeof exchangeName !== 'string' || !exchangeData) {
			return {
				notFound: true
			}
		}

		const [protocolRes, articles, pageStyles]: any = await Promise.all([
			getProtocol(exchangeName),
			fetchArticles({ tags: exchangeName }),
			getProtocolPageStyles(exchangeData.name)
		])

		let inflowsExist = false

		let cexCoin = exchangeData?.coin

		if (protocolRes?.chainTvls) {
			if (cexCoin) {
				let chainTvls = {}
				for (const chain in protocolRes?.chainTvls ?? {}) {
					let tvls = {}
					for (const item of protocolRes.chainTvls[chain].tokensInUsd ?? []) {
						for (const token in item.tokens ?? {}) {
							if (token !== cexCoin) {
								tvls[item.date] = (tvls[item.date] ?? 0) + item.tokens[token]
							}
						}
					}
					chainTvls[chain] = { tvl: Object.entries(tvls).map((x) => ({ date: x[0], totalLiquidityUSD: x[1] })) }
				}
				protocolRes.chainTvls = chainTvls
				const currentChainTvls = {}
				for (const chain in chainTvls) {
					if (chainTvls[chain].tvl.length === 0) continue
					currentChainTvls[chain] = chainTvls[chain].tvl[chainTvls[chain].tvl.length - 1].totalLiquidityUSD
				}
				protocolRes.currentChainTvls = currentChainTvls
			} else {
				Object.keys(protocolRes.chainTvls).forEach((chain) => {
					if (protocolRes.chainTvls[chain].tokensInUsd?.length > 0 && !inflowsExist) {
						inflowsExist = true
					}
					delete protocolRes.chainTvls[chain].tokensInUsd
					delete protocolRes.chainTvls[chain].tokens
				})
			}
		}

		const protocolData = fuseProtocolData(protocolRes)
		const backgroundColor = pageStyles['--primary-color']

		return {
			props: {
				articles,
				protocol: exchangeName,
				protocolData: { ...protocolData },
				backgroundColor,
				chartColors: { TVL: backgroundColor },
				methodologyUrls: {
					tvl: protocolData.module
						? `https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/projects/${protocolData.module}`
						: null
				},
				metrics: { tvl: true },
				pageStyles
			},
			revalidate: !protocolRes ? 0 : maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Protocols({ protocolData, ...props }) {
	return (
		<ProtocolContainer
			title={`${protocolData.name} - DefiLlama`}
			protocolData={protocolData}
			{...(props as any)}
			isCEX
			tab="assets"
		/>
	)
}
