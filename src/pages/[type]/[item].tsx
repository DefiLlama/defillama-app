import { GetStaticProps, GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import * as React from 'react'
import { revalidate } from '~/api'
import { getOverview, getOverviewItemPageData, ProtocolAdaptorSummaryProps } from '~/api/categories/adaptors'
import OverviewItemContainer from '~/containers/Overview/OverviewItem'
import { standardizeProtocolName } from '~/utils'
import { getColor } from '~/utils/getColor'

type PageParams = {
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

export async function getStaticPaths() {
	const { protocols: arrFees } = await getOverview('fees')
	/* const { protocols: arrVols } = await getOverview('volumes') */
	const paths = [
		...arrFees.map((protocol) => ({
			params: { type: 'fees', item: standardizeProtocolName(protocol.name) }
		})) /* ,
		...arrVols.map((protocol) => ({
			params: { type: 'volumes', item: standardizeProtocolName(protocol.name) }
		})) */
	]

	return { paths, fallback: 'blocking' }
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
