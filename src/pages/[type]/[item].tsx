import { GetStaticProps, GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import * as React from 'react'
import { revalidate } from '~/api'
import { getOverview, getOverviewItemPageData, ProtocolAdaptorSummaryProps } from '~/api/categories/adaptors'
import OverviewItemContainer from '~/containers/Overview/OverviewItem'
import { standardizeProtocolName } from '~/utils'
import { getColor } from '~/utils/getColor'

export interface ProtocolAdaptorSummaryProps extends Omit<ProtocolAdaptorSummaryResponse, 'totalDataChart'> {
	type: string
	totalDataChart: [IJoin2ReturnType, string[]]
	revenue24h: number | null
}

export type PageParams = {
	protocolSummary: ProtocolAdaptorSummaryProps
	backgroundColor: string
}

export const getStaticProps: GetStaticProps<PageParams> = async ({
	params
}: GetStaticPropsContext<{ type: string; item: string }>) => {
	const data = await getOverviewItemPageData(params.type, params.item)

	return {
		props: {
			protocolSummary: {
				...data,
				type: params.type
			},
			backgroundColor: await getColor(data.name, data.logo)
		},
		revalidate: revalidate()
	}
}

export const types = ['fees', 'aggregators', 'volumes', 'derivatives', 'incentives']
export async function getStaticPaths() {
	const rawPaths = await Promise.all(
		types.map(async (type) => {
			const { protocols } = await getOverview(type)
			return protocols.map((protocol) => ({
				params: { type, item: standardizeProtocolName(protocol.name) }
			}))
		})
	)
	return { paths: rawPaths.flat(), fallback: 'blocking' }
}

export default function ProtocolItem({ protocolSummary, ...props }: InferGetStaticPropsType<typeof getStaticProps>) {
	const type = protocolSummary.type === 'volumes' ? 'volume' : protocolSummary.type
	return (
		<OverviewItemContainer
			title={`${protocolSummary.name} ${type} - DefiLlama`}
			{...props}
			protocolSummary={protocolSummary}
		/>
	)
}
