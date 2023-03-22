import { ADAPTOR_TYPES } from '~/utils/adaptorsPages/types'
import { getStaticPropsByType } from '../../utils/adaptorsPages/[type]'
export const type = ADAPTOR_TYPES.ROYALTIES
export const getStaticProps = getStaticPropsByType(type)
export { default } from '../../utils/adaptorsPages/[type]'
