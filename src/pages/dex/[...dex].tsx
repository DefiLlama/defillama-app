import { InferGetStaticPropsType, GetStaticProps } from 'next'
import DexContainer from '~/containers/Dex/DexProtocol'
import { standardizeProtocolName } from '~/utils'
import { getColor } from '~/utils/getColor'
import { revalidate } from '~/api'
import { getDexs, getDex } from '~/api/categories/dexs'
import { IDexResponse } from '~/api/categories/dexs/types'

type PageParams = {
	dex: string
	dexData: IDexResponse
	backgroundColor: string
}

export const getStaticProps: GetStaticProps<PageParams> = async ({
	params: {
		dex: [dex]
	}
}) => {
	const dexRes = await getDex(dex)

	const backgroundColor = await getColor(dexRes.name, dexRes.logo)

	return {
		props: {
			dex,
			dexData: dexRes,
			backgroundColor
		},
		revalidate: revalidate()
	}
}

// export async function getStaticPaths() {
// 	const res = await getDexs()

// 	const paths = res.dexs.map((dex) => ({
// 		params: { dex: [standardizeProtocolName(dex.name)] }
// 	}))

// 	return { paths, fallback: 'blocking' }
// }

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Dexs({ dexData, ...props }: InferGetStaticPropsType<typeof getStaticProps>) {
	return <DexContainer title={`${dexData.name} Volume - DefiLlama`} dexData={dexData} dex={dexData.name} {...props} />
}
