import { ADAPTOR_TYPES } from '~/api/categories/adaptors'
import { getStaticPropsByType } from '~/utils/adaptorsPages/[type]'
export const type = ADAPTOR_TYPES.FEES
import { withPerformanceLogging } from '~/utils/perf'
export const getStaticProps = withPerformanceLogging('fees/simple/index', getStaticPropsByType(type))
export { default } from '~/utils/adaptorsPages/[type]'
