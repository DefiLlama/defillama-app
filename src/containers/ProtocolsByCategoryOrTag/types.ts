import { ILineAndBarChartProps } from '~/components/ECharts/types'

export interface IRWAStats {
	volumeUsd1d: number
	volumeUsd7d: number
	tvlUsd: number
	symbols: Array<string>
	matchExact?: boolean
	redeemable?: boolean
	attestations?: boolean
	cexListed?: boolean
	kyc?: boolean
	transferable?: boolean
	selfCustody?: boolean
}

interface IProtocolByCategory {
	name: string
	slug: string
	logo: string
	chains: Array<string>
	tvl: number | null
	extraTvls: Record<string, number>
	mcap: number | null
	fees?: Record<string, number> | null
	revenue?: Record<string, number> | null
	dexVolume?: Record<string, number>
	perpVolume?: Record<string, number> & { doublecounted?: boolean; zeroFeePerp?: boolean }
	openInterest?: { total24h: number }
	tags: Array<string>
	rwaStats?: IRWAStats | null
}

interface IProtocolByCategoryWithSubRows extends IProtocolByCategory {
	subRows?: IProtocolByCategory[]
}

export interface IProtocolByCategoryOrTagPageData {
	protocols: Array<IProtocolByCategoryWithSubRows>
	category: string | null
	tag: string | null
	isRWA: boolean
	chains: Array<{ label: string; to: string }>
	chain: string
	charts: ILineAndBarChartProps['charts']
	fees7d: number | null
	revenue7d: number | null
	dexVolume7d: number | null
	perpVolume7d: number | null
	openInterest: number | null
	extraTvlCharts: Record<string, Record<string, number>>
}
