import { GetStaticProps, GetStaticPropsContext } from 'next'
import { useRouter } from 'next/router'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/adaptors'
import { SEO } from '~/components/SEO'
import OverviewContainer, { IOverviewContainerProps } from '~/containers/DexsAndFees'
import Layout from '~/layout'
import { capitalizeFirstLetter } from '~/utils'

export const getStaticProps: GetStaticProps<IOverviewContainerProps> = async ({
	params
}: GetStaticPropsContext<{ type: string; chain: string }>) => {
	const data = await getChainPageData(params.type, params.chain).catch((e) =>
		console.info(`Chain page data not found ${params.type} ${params.chain}`, e)
	)

	if (!data || !data.protocols || data.protocols.length <= 0) return { notFound: true }

	const categories = new Set<string>()

	data.protocols.forEach((p) => {
		if (p.category) {
			categories.add(p.category)
		}
	})
	return {
		props: {
			...data,
			type: params.type,
			categories: Array.from(categories)
		},
		revalidate: maxAgeForNext([22])
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
	const router = useRouter()
	const isSimpleFees = router?.pathname?.includes('/fees/simple')

	return (
		<Layout title={`${capitalizeFirstLetter(props.type)} - DefiLlama`}>
			<SEO pageType={props.type} />
			<OverviewContainer {...props} isSimpleFees={isSimpleFees} />
		</Layout>
	)
}

export default AllChainsDexs
