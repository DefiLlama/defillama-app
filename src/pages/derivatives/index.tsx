import { ADAPTOR_TYPES } from '~/utils/adaptorsPages/types'
import { getStaticPropsByType } from '~/utils/adaptorsPages/[type]'
export const type = ADAPTOR_TYPES.DERIVATIVES
import { withPerformanceLogging } from '~/utils/perf'
export const getStaticProps = withPerformanceLogging('derivatives/index', getStaticPropsByType(type))
export { default } from '~/utils/adaptorsPages/[type]'
