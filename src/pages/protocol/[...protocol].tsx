import { InferGetStaticPropsType, GetStaticProps } from 'next'
import ProtocolContainer from '~/containers/Defi/Protocol'
import { standardizeProtocolName } from '~/utils'
import { getColor } from '~/utils/getColor'
import { revalidate } from '~/api'
import { getProtocols, getProtocol, fuseProtocolData } from '~/api/categories/protocols'
import { IFusedProtocolData, IProtocolResponse } from '~/api/types'
import { getYieldPageData, YieldsData } from '~/api/categories/yield'
import { getDex } from '~/api/categories/dexs'
import { IDexResponse } from '~/api/categories/dexs/types'
import { getStaticProps as getFeesProps, IFeesProps } from '~/pages/fees/[protocol]'

type PageParams = {
	protocol: string
	protocolData: IFusedProtocolData
	backgroundColor: string
	yields: YieldsData
	dex: IDexResponse
	fees: IFeesProps
}

export const getStaticProps: GetStaticProps<PageParams> = async ({
	params: {
		protocol: [protocol]
	}
}) => {
	const protocolRes: IProtocolResponse = await getProtocol(protocol)
	const yields = await getYieldPageData()
	const dex = await getDex(protocol)
	const fees = await getFeesProps({ params: { protocol } })

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

	return {
		props: {
			protocol,
			protocolData,
			backgroundColor,
			yields,
			dex,
			fees
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
			title={`${protocolData.name}: TVL and Stats - DefiLlama`}
			protocolData={protocolData}
			{...props}
		/>
	)
}
