import { getStaticPropsByType } from '../../utils/adaptorsPages/[type]'
export const type = 'options'
export const getStaticProps = getStaticPropsByType(type)
export { default } from '../../utils/adaptorsPages/[type]'

export async function getStaticPaths() {
	return {
		paths: [],
		fallback: 'blocking'
	}
}
