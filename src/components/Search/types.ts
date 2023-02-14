import { Dispatch, ReactNode } from 'react'

export interface ISearchItem {
	name: string
	route:
		| string
		| {
				pathname: string
				query: {
					[key: string]: string | Array<string>
				}
		  }
	logo?: string | null
	fallbackLogo?: string | null
	symbol?: string
}

// Define breadcrumb of the search
export interface IStep {
	category: string
	name: string
	route?: string
	hideOptions?: boolean
}

export interface IBaseSearchProps {
	data: ISearchItem[]
	loading?: boolean
	step?: IStep
	onSearchTermChange?: (searchValue: string) => void
	customPath?: (item: string) => string
	onItemClick?: (item: ISearchItem) => void
	filters?: ReactNode
	placeholder?: string
	withValue?: boolean
	value?: string | null
}

export interface ICommonSearchProps {
	step?: IBaseSearchProps['step']
	onItemClick?: IBaseSearchProps['onItemClick']
}

export enum SETS {
	PROTOCOLS = 'protocols',
	CHAINS = 'chains',
	GROUPED_CHAINS = 'grouped_chains'
}

export interface IGetSearchList {
	data: ISearchItem[]
	loading: boolean
	error?: boolean
	onSearchTermChange?: Dispatch<any>
	onItemClick?: (item: any) => void
}
