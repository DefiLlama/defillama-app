import { GetStaticProps, GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import * as React from 'react'
import { revalidate } from '~/api'
import { getChainPageData, getOverview, getOverviewItemPageData, IJoin2ReturnType } from '~/api/categories/adaptors'
import { ProtocolAdaptorSummary, ProtocolAdaptorSummaryResponse } from '~/api/categories/adaptors/types'
import SEO from '~/components/SEO'
import OverviewItemContainer from '~/containers/Overview/OverviewItem'
import { upperCaseFirst } from '~/containers/Overview/utils'
import Layout from '~/layout'
import { standardizeProtocolName } from '~/utils'
import { getColor } from '~/utils/getColor'

export interface ProtocolAdaptorSummaryProps extends Omit<ProtocolAdaptorSummaryResponse, 'totalDataChart'> {
	type: string
	totalDataChart: IJoin2ReturnType
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
