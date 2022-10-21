import * as React from 'react'
import { DesktopSearch } from '../Base'
import type { ICommonSearchProps } from '../types'
import { useGetTokensSearchList } from './hooks'

interface IYieldSearchProps extends ICommonSearchProps {
	pathname?: string
	lend?: boolean
	value?: string | null
}

export default function YieldsSearch({ lend = false, ...props }: IYieldSearchProps) {
	const { data, loading, onItemClick } = useGetTokensSearchList(lend)

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
