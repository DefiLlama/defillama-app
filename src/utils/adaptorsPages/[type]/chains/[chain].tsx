import { getOverview } from '~/api/categories/adaptors'
import { types } from '..'

export async function getStaticPaths() {
	const rawPaths = await Promise.all(
		types.map(async (type) => {
			const res = await getOverview(type)
			const { allChains } = res
			return allChains.map((chain) => ({
				params: { type, chain: chain.toLowerCase() }
			}))
		})
	)
	return { paths: rawPaths.flat(), fallback: 'blocking' }
}

export { default, getStaticProps } from '../'
