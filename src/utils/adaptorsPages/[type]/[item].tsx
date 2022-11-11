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
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (process.env.SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const { protocols } = await getOverview(type)
	const paths = protocols
		.sort((a, b) => {
			return b.total24h - a.total24h
		})
		.map((protocol) => ({
			params: { type, item: standardizeProtocolName(protocol.name) }
		}))

	// { fallback: false } means other routes should 404
	return { paths, fallback: false }
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
