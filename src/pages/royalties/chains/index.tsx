import { getStaticPropsByType } from '~/utils/adaptorsPages/[type]/chains'
import { type } from '..'
import { withPerformanceLogging } from '~/utils/perf'
export const getStaticProps = withPerformanceLogging('royalties/chains/index', getStaticPropsByType(type))
export { default } from '..'
