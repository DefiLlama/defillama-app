import { getStaticPathsByType } from '~/utils/adaptorsPages/[type]/chains/[chain]'
export const getStaticPaths = getStaticPathsByType('fees')
export { default, getStaticProps } from '../'
