import * as React from 'react'
import { revalidate } from '~/api'
import { getChainsPageData } from '~/api/categories/adaptors'

export async function getStaticProps({ params }) {
	const data = await getChainsPageData(params.type)
	return {
		props: data,
		revalidate: revalidate()
	}
}

export { default, getStaticPaths } from '..'
