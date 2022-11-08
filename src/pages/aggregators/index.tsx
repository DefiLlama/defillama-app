import { getStaticPropsByType } from '../../utils/adaptorsPages/[type]'
export const type = 'aggregators'
export const getStaticProps = getStaticPropsByType(type)
export { default } from '../../utils/adaptorsPages/[type]'
