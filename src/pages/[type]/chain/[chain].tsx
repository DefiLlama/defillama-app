import { getOverview } from '~/api/categories/adaptors'
import { types } from '../[item]'

export async function getStaticPaths() {
	const rawPaths = await Promise.all(
		types.map(async (type) => {
			const { allChains } = await getOverview(type)
			return allChains.map((chain) => ({
				params: { type, chain: chain.toLowerCase() }
			}))
		})
	)
	return { paths: rawPaths.flat(), fallback: 'blocking' }
}

export { default, getStaticProps } from './../../[type]'
