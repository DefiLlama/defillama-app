import ProtocolContainer from '~/containers/Defi/Protocol'
import { tokenIconPaletteUrl } from '~/utils'
import { getColor } from '~/utils/getColor'
import { maxAgeForNext } from '~/api'
import { getProtocol, fuseProtocolData } from '~/api/categories/protocols'
import { IProtocolResponse } from '~/api/types'
import { DummyProtocol } from '~/containers/Defi/Protocol/Dummy'
import { fetchArticles, IArticle } from '~/api/categories/news'
import { cexData } from '../cexs'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'cex/[...cex]',
	async ({
		params: {
			cex: [exchangeName]
		}
	}) => {
		// if cex is not string, return 404
		if (typeof exchangeName !== 'string') {
			return {
				notFound: true
			}
		}

		const [protocolRes, articles]: [IProtocolResponse, IArticle[]] = await Promise.all([
			getProtocol(exchangeName),
			fetchArticles({ tags: exchangeName })
		])

		let inflowsExist = false

		if (protocolRes?.chainTvls) {
			Object.keys(protocolRes.chainTvls).forEach((chain) => {
				if (protocolRes.chainTvls[chain].tokensInUsd?.length > 0 && !inflowsExist) {
					inflowsExist = true
				}

				delete protocolRes.chainTvls[chain].tokensInUsd
				delete protocolRes.chainTvls[chain].tokens
			})
		}

		const protocolData = fuseProtocolData(protocolRes)

		const backgroundColor = await getColor(tokenIconPaletteUrl(protocolData.name))

		return {
			props: {
				articles,
				protocol: exchangeName,
				protocolData: { ...protocolData, metrics: { ...protocolData.metrics, inflows: inflowsExist } },
				backgroundColor,
				chartColors: { TVL: backgroundColor },
				methodologyUrls: {
					tvl: protocolData.module
						? `https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/projects/${protocolData.module}`
						: null
				}
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	const paths = cexData
		.filter((cex) => cex.slug)
		.map(({ slug }) => ({
			params: { cex: [slug] }
		}))

	return { paths, fallback: 'blocking' }
}

export default function Protocols({ protocolData, ...props }) {
	if (protocolData.module === 'dummy.js') {
		return (
			<DummyProtocol
				data={protocolData}
				title={`${protocolData.name} - DefiLlama`}
				backgroundColor={props.backgroundColor}
				protocol={props.protocol}
			/>
		)
	}

	return (
		<ProtocolContainer
			title={`${protocolData.name} - DefiLlama`}
			protocolData={protocolData}
			{...(props as any)}
			isCEX
		/>
	)
}
