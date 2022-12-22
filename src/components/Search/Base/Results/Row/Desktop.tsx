import { useRouter } from 'next/router'
import styled from 'styled-components'
import { ComboboxItem } from 'ariakit/combobox'
import TokenLogo from '~/components/TokenLogo'

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

export const DesktopRow = ({ data, onItemClick }) => {
	const router = useRouter()

	return (
		<Item
			value={data.name}
			onClick={() => {
				if (onItemClick) {
					onItemClick(data)
				} else {
					router.push(data.route)
				}
			}}
			focusOnHover
		>
			{data?.logo && <TokenLogo logo={data?.logo} external={isExternalImage(data.logo)} />}
			<span>{data.name}</span>
		</Item>
	)
}
