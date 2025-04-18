import { IJSON } from '~/api/categories/adaptors/types'

interface IAdapter {
	name: string
	displayName?: string
	chains: Array<string>
	change_1d: number
	change_7d: number
	change_1m: number
	totalVolume24h: number
	volumetvl: number
	dominance: number
	disabled: boolean
	logo?: string
	methodology: string | IJSON<string>
	category?: string
}

export interface IAdapterRow extends IAdapter {
	subRows?: Array<IAdapter>
	defillamaId?: string
}
