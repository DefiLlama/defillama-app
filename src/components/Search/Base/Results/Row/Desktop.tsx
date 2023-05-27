import { useRouter } from 'next/router'
import styled from 'styled-components'
import { ComboboxItem } from 'ariakit/combobox'
import TokenLogo from '~/components/TokenLogo'
import { useState } from 'react'

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

	&[aria-disabled='true'] {
		opacity: 0.5;
		background-color: ${({ theme }) => theme.bg2};
	}
`

export const DesktopRow = ({ data, onItemClick, state }) => {
	const [loading, setLoading] = useState(false)
	const router = useRouter()

	return (
		<Item
			value={data.name}
			onClick={() => {
				if (onItemClick) {
					onItemClick(data)
				} else {
					setLoading(true)

					router.push(data.route).then(() => {
						setLoading(false)
						state.hide()
					})
				}
			}}
			focusOnHover
			hideOnClick={false}
			setValueOnClick={false}
			disabled={loading}
		>
			{(data?.logo || data?.fallbackLogo) && <TokenLogo logo={data?.logo} fallbackLogo={data?.fallbackLogo} />}
			<span>{data.name}</span>
			{loading && (
				<svg
					version="1.1"
					id="svg-spinner"
					xmlns="http://www.w3.org/2000/svg"
					xmlnsXlink="http://www.w3.org/1999/xlink"
					x="0px"
					y="0px"
					viewBox="10 10 80 80"
					xmlSpace="preserve"
					height={12}
				>
					<circle
						cx="50"
						cy="50"
						fill="none"
						stroke="#7e96ff"
						strokeWidth="10"
						r="35"
						strokeDasharray="164.93361431346415 56.97787143782138"
					>
						<animateTransform
							attributeName="transform"
							type="rotate"
							repeatCount="indefinite"
							dur="1s"
							values="0 50 50;360 50 50"
							keyTimes="0;1"
						></animateTransform>
					</circle>
				</svg>
			)}
		</Item>
	)
}
