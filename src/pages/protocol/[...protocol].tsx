import { InferGetStaticPropsType, GetStaticProps } from 'next'
import ProtocolContainer from '~/containers/ProtocolContainer'
import { standardizeProtocolName } from '~/utils'
import { getColor } from '~/utils/getColor'
import { revalidate } from '~/api'
import { getProtocols, getProtocol, fuseProtocolData } from '~/api/categories/protocols'
import { IFusedProtocolData, IProtocolResponse } from '~/api/types'

type PageParams = {
	protocol: string
	protocolData: IFusedProtocolData
	backgroundColor: string
}

export const getStaticProps: GetStaticProps<PageParams> = async ({
	params: {
		protocol: [protocol]
	}
}) => {
	const protocolRes: IProtocolResponse = await getProtocol(protocol)

	if (!protocolRes || !protocolRes.name) {
		return {
			notFound: true
		}
	}

	delete protocolRes.tokensInUsd
	delete protocolRes.tokens

	Object.keys(protocolRes.chainTvls).forEach((chain) => {
		delete protocolRes.chainTvls[chain].tokensInUsd
		delete protocolRes.chainTvls[chain].tokens
	})

	const protocolData = fuseProtocolData(protocolRes)

	const backgroundColor = await getColor(protocol, protocolData.logo)

	return {
		props: {
			protocol,
			protocolData,
			backgroundColor
		},
		revalidate: revalidate()
	}
}

export async function getStaticPaths() {
	const res = await getProtocols()

	const paths: string[] = res.protocols.slice(0, 30).map(({ name }) => ({
		params: { protocol: [standardizeProtocolName(name)] }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Protocols({ protocolData, ...props }: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<ProtocolContainer
			title={`${protocolData.name}: TVL and stats - DefiLlama`}
			protocolData={protocolData}
			{...props}
		/>
	)
}
