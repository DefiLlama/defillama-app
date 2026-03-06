import type { IResponseCGMarketsAPI } from '~/api/types'

export type CompareTokenProtocol = {
	geckoId?: string | null
	name: string
	tvl?: number | null
	fees?: number | null
	revenue?: number | null
}

export type CompareTokensPageData = {
	coinsData: Array<IResponseCGMarketsAPI & { label: string; value: string }>
	protocols: CompareTokenProtocol[]
}
