import { getOverview } from '~/api/categories/adaptors'

export const getStaticPathsByType = (type: string) => async () => {
	const res = await getOverview(type)
	const { allChains } = res
	const paths = allChains.map((chain) => ({
		params: { type, chain: chain.toLowerCase() }
	}))
	return { paths, fallback: 'blocking' }
}

export { default, getStaticProps } from '../'
