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

export interface IBaseSearchProps {
	data?: ISearchItem[] | null
	loading?: boolean
	onSearchTermChange?: (searchValue: string) => void
	customPath?: (item: string) => string
	onItemClick?: (item: ISearchItem) => void
	filters?: ReactNode
	placeholder?: string
	withValue?: boolean
	value?: string | null
	className?: string
	variant?: 'primary' | 'secondary'
}

export interface ICommonSearchProps {
	onItemClick?: IBaseSearchProps['onItemClick']
}

export enum SETS {
	PROTOCOLS = 'protocols',
	CHAINS = 'chains',
	GROUPED_CHAINS = 'grouped_chains',
	CATEGORIES = 'categories'
}

export interface IGetSearchList {
	data: ISearchItem[]
	loading: boolean
	error?: boolean
	onSearchTermChange?: Dispatch<any>
	onItemClick?: (item: any) => void
}
