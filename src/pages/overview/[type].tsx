import { GetStaticProps, GetStaticPropsContext } from 'next'
import * as React from 'react'
import { revalidate } from '~/api'
import { getChainPageData } from '~/api/categories/adaptors'
import SEO from '~/components/SEO'
import OverviewContainer, { IOverviewContainerProps } from '~/containers/Overview'
import { upperCaseFirst } from '~/containers/Overview/utils'
import Layout from '~/layout'

export const getStaticProps: GetStaticProps<IOverviewContainerProps> = async ({
	params
}: GetStaticPropsContext<{ type: string; chain: string }>) => {
	const data = await getChainPageData(params.type, params.chain)
	return {
		props: {
			...data,
			type: params.type
		},
		revalidate: revalidate()
	}
}

export async function getStaticPaths() {
	const paths = ['fees' /* , 'volumes' */].map((type) => ({
		params: { type }
	}))

	return { paths, fallback: 'blocking' }
}

const AllChainsDexs = (props: IOverviewContainerProps) => {
	return (
		<Layout title={`${upperCaseFirst(props.type)} - DefiLlama`}>
			<SEO dexsPage />
			<OverviewContainer {...props} />
		</Layout>
	)
}

export default AllChainsDexs
