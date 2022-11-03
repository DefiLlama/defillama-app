import * as React from 'react'
import { revalidate } from '~/api'
import { getChainsPageData } from '~/api/categories/adaptors'

async function getStaticProps({ params }) {
	const data = await getChainsPageData(params.type)
	return {
		props: data,
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

export { default, getStaticPaths } from '..'
