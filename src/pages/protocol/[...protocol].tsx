import ProtocolContainer from '~/containers/Defi/Protocol'
import { standardizeProtocolName } from '~/utils'
import { getColor } from '~/utils/getColor'
import { maxAgeForNext } from '~/api'
import { getProtocols, getProtocol, fuseProtocolData, getProtocolsRaw } from '~/api/categories/protocols'
import { IProtocolResponse } from '~/api/types'

export const getStaticProps = async ({
	params: {
		protocol: [protocol]
	}
}) => {
	const protocolRes: IProtocolResponse = await getProtocol(protocol)

	delete protocolRes.tokensInUsd
	delete protocolRes.tokens

	if (protocolRes.chainTvls) {
		Object.keys(protocolRes.chainTvls).forEach((chain) => {
			delete protocolRes.chainTvls[chain].tokensInUsd
			delete protocolRes.chainTvls[chain].tokens
		})
	}

	const protocolData = fuseProtocolData(protocolRes)

	const backgroundColor = await getColor(protocol, protocolData.logo)

	const similarProtocols = (await getProtocolsRaw())?.protocols
		.filter(
			(p) =>
				p.category?.toLowerCase() === protocolData.category?.toLowerCase() &&
				p.name.toLowerCase() !== protocolData.name?.toLowerCase()
		)
		?.map((p) => {
			let commonChains = 0

			protocolData?.chains?.forEach((chain) => {
				if (p.chains.includes(chain)) {
					commonChains += 1
				}
			})

			return { name: p.name, tvl: p.tvl, commonChains }
		})
		?.sort((a, b) => b.tvl - a.tvl)

	const similarProtocolsSet = new Set<string>()

	const protocolsWithCommonChains = [...similarProtocols].sort((a, b) => b.commonChains - a.commonChains).slice(0, 5)

	// first 5 are the protocols that are on same chain + same category
	protocolsWithCommonChains.forEach((p) => similarProtocolsSet.add(p.name))

	// last 5 are the protocols in same category
	similarProtocols.forEach((p) => {
		if (similarProtocolsSet.size < 10) {
			similarProtocolsSet.add(p.name)
		}
	})

	return {
		props: {
			protocol,
			protocolData,
			backgroundColor,
			similarProtocols: Array.from(similarProtocolsSet).map((protocolName) =>
				similarProtocols.find((p) => p.name === protocolName)
			)
		},
		revalidate: maxAgeForNext([22])
	}
}

export async function getStaticPaths() {
	const res = await getProtocols()

	const paths: string[] = res.protocols.slice(0, 30).map(({ name }) => ({
		params: { protocol: [standardizeProtocolName(name)] }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Protocols({ protocolData, ...props }) {
	return (
		<ProtocolContainer
			title={`${protocolData.name}: TVL and Stats - DefiLlama`}
			protocolData={protocolData}
			{...props as any}
		/>
	)
}
