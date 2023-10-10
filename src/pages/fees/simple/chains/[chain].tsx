import { getStaticPathsByType } from '~/utils/adaptorsPages/[type]/chains/[chain]'
import { type } from '../..'
export const getStaticPaths = getStaticPathsByType(type)
export { default, getStaticProps } from '../..'
