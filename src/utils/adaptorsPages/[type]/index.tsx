import { GetStaticProps, GetStaticPropsContext } from 'next'
import * as React from 'react'
import { expiresForNext, maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/adaptors'
import SEO from '~/components/SEO'
import OverviewContainer, { IOverviewContainerProps } from '~/containers/DexsAndFees'
import Layout from '~/layout'
import { capitalizeFirstLetter } from '~/utils'

export const getStaticProps: GetStaticProps<IOverviewContainerProps> = async ({
	params
}: GetStaticPropsContext<{ type: string; chain: string }>) => {
	const data = await getChainPageData(params.type, params.chain)
	return {
		props: {
			...data,
			type: params.type
		},
		revalidate: maxAgeForNext([22]),
		expires: expiresForNext([22])
	}
}

export const getStaticPropsByType = (type: string) => {
	return (context) =>
		getStaticProps({
			...context,
			params: {
				...context.params,
				type
			}
		})
}

const AllChainsDexs = (props: IOverviewContainerProps) => {
	return (
		<Layout title={`${capitalizeFirstLetter(props.type)} - DefiLlama`}>
			<SEO pageType={props.type} />
			<OverviewContainer {...props} />
		</Layout>
	)
}

export default AllChainsDexs
