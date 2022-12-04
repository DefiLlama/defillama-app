import { getStaticPropsByType } from '../../utils/adaptorsPages/[type]'
export const type = 'dexs'
export const getStaticProps = getStaticPropsByType(type)
export { default } from '../../utils/adaptorsPages/[type]'
