import { type } from '.'
import { getStaticPropsByType, getStaticPathsByType } from '../../utils/adaptorsPages/[type]/[item]'
import { withPerformanceLogging } from '~/utils/perf'
export const getStaticProps = withPerformanceLogging('aggregators/[item]', getStaticPropsByType(type))
export const getStaticPaths = getStaticPathsByType(type)
export { default } from '../../utils/adaptorsPages/[type]/[item]'
