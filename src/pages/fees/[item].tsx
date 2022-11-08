import { getStaticPropsByType, getStaticPathsByType } from '../../utils/adaptorsPages/[type]/[item]'
export const getStaticProps = getStaticPropsByType('fees')
export const getStaticPaths = getStaticPathsByType('fees')
export { default } from '../../utils/adaptorsPages/[type]/[item]'
