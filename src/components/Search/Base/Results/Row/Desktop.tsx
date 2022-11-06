import { useRouter } from 'next/router'
import styled from 'styled-components'
import { ComboboxItem } from 'ariakit/combobox'
import TokenLogo from '~/components/TokenLogo'
import type { ISearchItem } from '../../../types'

const Item = styled(ComboboxItem)`
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

const isExternalImage = (imagePath: string) => {
	return imagePath?.includes('http')
}

export const DesktopRow = ({ index, style, data }) => {
	const { searchData, options, onItemClick } = data

	const value = options[index]

	const item: ISearchItem = searchData.find((x) => x.name === value)

	const router = useRouter()

	return (
		<Item
			key={value}
			value={value}
			onClick={() => {
				if (onItemClick) {
					onItemClick(item)
				} else {
					router.push(item.route)
				}
			}}
			style={style}
			focusOnHover
		>
			{item?.logo && (
				<TokenLogo
					logo={item?.logo}
					external={isExternalImage(item.logo)}
					skipApiRoute={router.pathname.includes('/yield')}
				/>
			)}
			<span>{value}</span>
		</Item>
	)
}
