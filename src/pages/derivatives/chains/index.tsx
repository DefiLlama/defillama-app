import { getStaticPropsByType } from '~/utils/adaptorsPages/[type]/chains'
import { type } from '..'
import { withPerformanceLogging } from '~/utils/perf'
export const getStaticProps = withPerformanceLogging('derivatives/chains/index', getStaticPropsByType(type))
export { default } from '..'
