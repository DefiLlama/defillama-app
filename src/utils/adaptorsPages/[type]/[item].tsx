import { GetStaticProps, GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import * as React from 'react'
import { revalidate } from '~/api'
import { getOverview, getOverviewItemPageData, ProtocolAdaptorSummaryProps } from '~/api/categories/adaptors'
import OverviewItemContainer from '~/containers/Overview/OverviewItem'
import { standardizeProtocolName } from '~/utils'
import { getColor } from '~/utils/getColor'

export type PageParams = {
	protocolSummary: ProtocolAdaptorSummaryProps
	backgroundColor: string
}

const getStaticProps: GetStaticProps<PageParams> = async ({
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

export const getStaticPropsByType = (type: string) => (context) =>
	getStaticProps({
		...context,
		params: {
			...context.params,
			type
		}
	})

export const getStaticPathsByType = (type: string) => async () => {
	const { protocols } = await getOverview(type)
	const rawPaths = protocols.map((protocol) => ({
		params: { type, item: standardizeProtocolName(protocol.name) }
	}))
	return { paths: rawPaths, fallback: 'blocking' }
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
