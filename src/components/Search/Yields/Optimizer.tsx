import * as React from 'react'
import { DesktopSearch } from '../Base'
import type { ICommonSearchProps } from '../types'
import { useGetTokensSearchList } from './hooks'

interface IYieldSearchProps extends ICommonSearchProps {
	pathname?: string
	lend?: boolean
}

export default function YieldsSearch({ lend = false, ...props }: IYieldSearchProps) {
	const { data, loading, onItemClick } = useGetTokensSearchList(lend)

	return (
		<DesktopSearch
			{...props}
			data={data}
			loading={loading}
			onItemClick={onItemClick}
			placeholder={lend ? 'Token to Lend' : 'Token to Borrow'}
		/>
	)
}
