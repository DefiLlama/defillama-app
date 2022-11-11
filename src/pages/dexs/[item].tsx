import { type } from '.'
import { getStaticPropsByType, getStaticPathsByType } from '../../utils/adaptorsPages/[type]/[item]'
export const getStaticProps = getStaticPropsByType(type)
export const getStaticPaths = async () => {
	const defaultStaticPaths = await getStaticPathsByType(type)()
	return {
		...defaultStaticPaths,
		paths: defaultStaticPaths.paths.slice(0, 5),
		fallback: 'blocking'
	}
}
export { default } from '../../utils/adaptorsPages/[type]/[item]'
