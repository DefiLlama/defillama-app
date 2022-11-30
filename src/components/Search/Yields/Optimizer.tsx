import * as React from 'react'
import { DesktopSearch } from '../Base'
import type { ICommonSearchProps } from '../types'
import { useGetTokensSearchList } from './hooks'

interface IYieldSearchProps extends ICommonSearchProps {
	pathname?: string
	lend?: boolean
	value?: string | null
	searchData: Array<{ name: string; symbol: string; image: string }>
}

export default function YieldsSearch({ lend = false, searchData, ...props }: IYieldSearchProps) {
	const { data, loading, onItemClick } = useGetTokensSearchList({ lend, searchData })

	return (
		<DesktopSearch
			{...props}
			withValue
			data={data}
			loading={loading}
			onItemClick={onItemClick}
			placeholder={lend ? 'Collateral Token' : 'Token to Borrow'}
		/>
	)
}
