import { getStaticPropsByType } from '../../utils/adaptorsPages/[type]'
export const type = 'derivatives'
export const getStaticProps = getStaticPropsByType(type)
export { default } from '../../utils/adaptorsPages/[type]'
