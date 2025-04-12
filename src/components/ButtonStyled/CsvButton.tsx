import { ReactNode, useState } from 'react'
import { IS_PRO_API_ENABLED } from '~/containers/ProApi/lib/constants'
import dynamic from 'next/dynamic'
import { Icon } from '~/components/Icon'

const ProCSVDownload = dynamic(() => import('~/containers/ProApi/ProDownload').then((comp) => comp.ProCSVDownload), {
	ssr: false
}) as React.FC<{ onClick: () => void; clicked: number }>

export const CSVDownloadButton = ({
	onClick,
	customText = '',
	className,
	smol
}: {
	onClick: () => void
	isLight?: boolean
	customText?: ReactNode
	className?: string
	smol?: boolean
}) => {
	const [verifyAndDownload, setVerifyAndDownload] = useState(0)

	return (
		<>
			<button
				className={`flex items-center gap-1 justify-center py-1 px-2 whitespace-nowrap text-xs rounded-md text-[var(--link-text)] bg-[var(--link-bg)] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] ${className}`}
				onClick={() => (IS_PRO_API_ENABLED ? setVerifyAndDownload((prev) => prev + 1) : onClick())}
			>
				{customText ? (
					<span>{customText}</span>
				) : (
					<>
						<Icon name="download-paper" className="h-3 w-3" />
						<span>{smol ? '' : 'Download'} .csv</span>
					</>
				)}
				{IS_PRO_API_ENABLED ? (
					<span className="inline-block py-1 px-2 rounded-full text-white text-xs font-bold">DefiLlama Pro</span>
				) : null}
			</button>
			{verifyAndDownload ? <ProCSVDownload onClick={onClick} clicked={verifyAndDownload} /> : null}
		</>
	)
}
