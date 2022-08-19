import { DEFAULT_ASSETS_LIST } from '~/utils/liquidations'
import type { IGetSearchList } from '../types'

export function useGetLiquidationSearchList(): IGetSearchList {
	return { data: DEFAULT_ASSETS_LIST, loading: false }
}
