import { GetStaticProps, GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { getOverview, getOverviewItemPageData, ProtocolAdaptorSummaryProps } from '~/api/categories/adaptors'
import { primaryColor } from '~/constants/colors'
import OverviewItemContainer from '~/containers/DexsAndFees/OverviewItem'
import { standardizeProtocolName } from '~/utils'
import { volumeTypes } from '../utils'

export type PageParams = {
	protocolSummary: ProtocolAdaptorSummaryProps
}

const getStaticProps: GetStaticProps<PageParams> = async ({
	params
}: GetStaticPropsContext<{ type: string; item: string }>) => {
	const data = await getOverviewItemPageData(params.type, params.item).catch((e) =>
		console.info(`Item page data not found ${params.type} ${params.item}`, e)
	)
	if (!data || !data.name) return { notFound: true }
	return {
		props: {
			protocolSummary: {
				...data,
				type: params.type
			}
		},
		revalidate: maxAgeForNext([22])
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
		// .slice(0, 5)
		.map((protocol) => ({
			params: { type, item: standardizeProtocolName(protocol.name) }
		}))

	return { paths, fallback: 'blocking' }
}

export default function ProtocolItem({ protocolSummary, ...props }: InferGetStaticPropsType<typeof getStaticProps>) {
	const type = volumeTypes.includes(protocolSummary.type) ? 'volume' : protocolSummary.type
	return (
		<OverviewItemContainer
			title={`${protocolSummary.name} ${type} - DefiLlama`}
			{...props}
			protocolSummary={protocolSummary}
		/>
	)
}
