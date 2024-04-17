import { type } from '.'
import { getStaticPropsByType } from '../../utils/adaptorsPages/[type]/[item]'
import { withPerformanceLogging } from '~/utils/perf'
export const getStaticProps = withPerformanceLogging('derivatives-aggregator/[item]', getStaticPropsByType(type))

export async function getStaticPaths() {
	return {
		paths: [],
		fallback: 'blocking'
	}
}

export { default } from '../../utils/adaptorsPages/[type]/[item]'
