import { DEFAULT_ASSETS_LIST } from '~/utils/liquidations'

export function useGetLiquidationSearchList() {
	return { data: DEFAULT_ASSETS_LIST, loading: false }
}
