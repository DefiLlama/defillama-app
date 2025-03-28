import { CSSProperties, useState } from 'react'
import { ButtonDark, ButtonLight, GrayButton } from '.'
import { IS_PRO_API_ENABLED } from '~/containers/ProApi/lib/constants'
import dynamic from 'next/dynamic'

const ProCSVDownload = dynamic(() => import('~/containers/ProApi/ProDownload').then((comp) => comp.ProCSVDownload), {
	ssr: false
}) as React.FC<{ onClick: () => void; clicked: number }>

export const CSVDownloadButton = ({
	onClick,
	style = {},
	isLight = false,
	customText = '',
	isGray = false,
	className
}: {
	onClick: () => void
	style?: CSSProperties
	isLight?: boolean
	customText?: string
	isGray?: boolean
	className?: string
}) => {
	const Button = className ? 'button' : isGray ? GrayButton : isLight ? ButtonLight : ButtonDark
	const text = customText || 'Download .csv'

	const [verifyAndDownload, setVerifyAndDownload] = useState(0)

	return (
		<>
			<Button
				className={className}
				onClick={() => (IS_PRO_API_ENABLED ? setVerifyAndDownload((prev) => prev + 1) : onClick())}
				style={style}
			>
				{text}{' '}
				{IS_PRO_API_ENABLED ? (
					<span
						className="inline-block py-1 px-2 rounded-full text-white text-xs font-bold bg-[#02172f] data-[islight=true]:bg-[#0056b9]"
						data-islight={isLight}
					>
						DefiLlama Pro
					</span>
				) : null}
			</Button>
			{verifyAndDownload ? <ProCSVDownload onClick={onClick} clicked={verifyAndDownload} /> : null}
		</>
	)
}
