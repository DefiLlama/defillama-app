import { useRouter } from 'next/router'
import { CSSProperties } from 'react'
import styled from 'styled-components'
// import { useVerified } from '~/containers/ProContainer/hooks/useVerified'
import { ButtonDark, ButtonLight } from '.'
import { IS_PRO_API_ENABLED } from '~/containers/ProApi/lib/constants'

interface BadgeProps {
	text: string
	color?: string
	isLight?: boolean
}

const BadgeWrapper = styled.span<{ color: string; isLight }>`
	display: inline-block;
	padding: 4px 8px;
	border-radius: 9999px;
	background-color: ${(props) => (props.isLight ? '#0056b9' : '#02172f')};
	color: #fff;
	font-size: 12px;
	font-weight: bold;
`

const Badge: React.FC<BadgeProps> = ({ text, color, isLight }) => {
	return (
		<BadgeWrapper color={color} isLight={isLight}>
			{text}
		</BadgeWrapper>
	)
}

const GrayButton = styled(ButtonDark)`
	background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
`

const CSVDownloadButton = ({
	onClick,
	style = {},
	isLight = false,
	customText = '',
	isGray = false
}: {
	onClick: () => void
	style?: CSSProperties
	isLight?: boolean
	customText?: string
	isGray?: boolean
}) => {
	// const { isVerified } = useVerified()
	const isVerified = false
	const router = useRouter()
	const Button = isGray ? GrayButton : isLight ? ButtonLight : ButtonDark
	const text = customText || 'Download .csv'
	if (!isVerified && IS_PRO_API_ENABLED) {
		return (
			<Button
				style={style}
				onClick={() => {
					router.push({ pathname: '/pro-api', query: { from: router.pathname } }, undefined, { shallow: true })
				}}
			>
				{text} <Badge text="DefiLlama Pro" isLight={isLight} />
			</Button>
		)
	}

	return (
		<Button onClick={onClick} style={style}>
			{text} {IS_PRO_API_ENABLED ? <Badge text="DefiLlama Pro" isLight={isLight} /> : null}
		</Button>
	)
}

export default CSVDownloadButton
