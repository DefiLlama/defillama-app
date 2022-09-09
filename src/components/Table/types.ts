import * as React from 'react'

export interface IColumnProps {
	header: string
	accessor: string
	disableSortBy?: boolean
	helperText?: string
	Cell?: any
}

export interface IRowProps {
	columns: IColumnProps[]
	item: { [key: string]: any }
	index?: number
	subRow?: boolean
}

export interface ITableProps {
	columns: IColumnProps[]
	data: unknown
	align?: string
	gap?: string
	pinnedRow?: unknown
	style?: React.CSSProperties
	columnToSort?: string
	sortDirection?: -1 | 0 | 1
}

export type TColumns =
	| 'protocolName'
	| 'peggedAsset'
	| 'peggedAssetChain'
	| 'category'
	| 'chainName'
	| 'chains'
	| '1dChange'
	| '7dChange'
	| '1mChange'
	| 'tvl'
	| 'mcaptvl'
	| 'listedAt'
	| 'msizetvl'
	| 'protocols'
	| 'dexName'
	| 'totalVolume24h'
	| 'fees'
	| 'revenue'
	| 'feesProtocol'
	| 'chainsVolume'
	| 'volumetvl'

export interface INameProps {
	type: 'chain' | 'protocol' | 'peggedAsset' | 'peggedAssetChain' | 'dex' | 'fees'
	value: string
	symbol?: string
	index?: number
	bookmark?: boolean
	rowType?: 'pinned' | 'accordion' | 'child' | 'default'
	showRows?: boolean
}

export interface INameFees extends INameProps{
	version?: string
}

export interface INameYield extends Omit<INameProps, 'type'> {
	project: string
	projectslug: string
	airdrop?: boolean
}

export interface INameYieldPoolProps {
	value: string
	configID: string
	url: string
	index?: number
	bookmark?: boolean
	rowType?: 'pinned' | 'default' | 'accordion'
}
