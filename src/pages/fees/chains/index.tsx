import { getStaticPropsByType } from '~/utils/adaptorsPages/[type]/chains'
import { type } from '..'
export const getStaticProps = getStaticPropsByType(type)
export { default } from '..'
