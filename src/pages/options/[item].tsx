import { withPerformanceLogging } from '~/utils/perf'
import { type } from '.'
import { getStaticPropsByType } from '~/utils/adaptorsPages/[type]/[item]'

export const getStaticProps = withPerformanceLogging('options/[item]', getStaticPropsByType(type))

export async function getStaticPaths() {
	return {
		paths: [],
		fallback: 'blocking'
	}
}

export { default } from '~/utils/adaptorsPages/[type]/[item]'
