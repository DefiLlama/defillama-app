import { CSSProperties, useState } from 'react'
import styled from 'styled-components'
import { ButtonDark, ButtonLight } from '.'
import { IS_PRO_API_ENABLED } from '~/containers/ProApi/lib/constants'
import dynamic from 'next/dynamic'

const ProCSVDownload = dynamic(() => import('~/containers/ProApi/ProDownload').then((comp) => comp.ProCSVDownload), {
	ssr: false
}) as React.FC<{ onClick: () => void; clicked: number }>

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
	const Button = isGray ? GrayButton : isLight ? ButtonLight : ButtonDark
	const text = customText || 'Download .csv'

	const [verifyAndDownload, setVerifyAndDownload] = useState(0)

	return (
		<>
			<Button onClick={() => setVerifyAndDownload((prev) => prev + 1)} style={style}>
				{text} {IS_PRO_API_ENABLED ? <Badge text="DefiLlama Pro" isLight={isLight} /> : null}
			</Button>
			{verifyAndDownload ? <ProCSVDownload onClick={onClick} clicked={verifyAndDownload} /> : null}
		</>
	)
}

export default CSVDownloadButton
