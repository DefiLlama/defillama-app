import { type } from '.'
import { getStaticPropsByType, getStaticPathsByType } from '../../utils/adaptorsPages/[type]/[item]'
export const getStaticProps = getStaticPropsByType(type)
export const getStaticPaths = getStaticPathsByType(type)
export { default } from '../../utils/adaptorsPages/[type]/[item]'
