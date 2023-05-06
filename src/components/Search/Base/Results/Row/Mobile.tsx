import * as React from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import TokenLogo from '~/components/TokenLogo'
import type { ISearchItem } from '../../../types'

const Item = styled.div`
	padding: 12px 14px;
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 0.85rem;
	color: ${({ theme }) => theme.text1};

	& > * {
		margin-right: 6px;
	}

	:hover {
		cursor: pointer;
		background-color: ${({ theme }) => theme.bg2};
	}

	&[data-active-item] {
		background-color: ${({ theme }) => theme.bg2};
	}
`

export const MobileRow = ({
	data,
	onItemClick,
	...props
}: {
	data: ISearchItem
	onItemClick?: (item) => void
	style?: React.CSSProperties
}) => {
	const router = useRouter()

	return (
		<Item
			onClick={() => {
				if (onItemClick) {
					onItemClick(data)
				} else {
					if (typeof data.route === 'string') {
						window.open('https://defillama.com' + data.route, '_blank')
					} else {
						router.push(data.route)
					}
				}
			}}
			{...props}
		>
			{(data?.logo || data?.fallbackLogo) && <TokenLogo logo={data?.logo} fallbackLogo={data?.fallbackLogo} />}
			<span>{data.name}</span>
		</Item>
	)
}
