import { ADAPTOR_TYPES } from '~/utils/adaptorsPages/types'
import { getStaticPropsByType } from '../../utils/adaptorsPages/[type]'
export const type = ADAPTOR_TYPES.FEES
import { withPerformanceLogging } from '~/utils/perf'
export const getStaticProps = withPerformanceLogging('fees/index', getStaticPropsByType(type))
export { default } from '../../utils/adaptorsPages/[type]'
