import clsx from 'clsx'
import React from 'react'

interface TitleLineProps {
	title?: string
	hideOnMobile?: boolean
}

export const TitleLine: React.FC<TitleLineProps> = (props) => {
	const { title = '', hideOnMobile = false } = props

	return (
		<div className="flex grow items-center gap-x-[15px] text-[18px] leading-[150%] font-medium text-[#0c2956] dark:text-white">
			<div>{title}</div>
			<div
				className={clsx(
					'grow border-t lg:border-t-[2px]',
					'border-[#0c2956] dark:border-white',
					hideOnMobile && 'max-md:hidden'
				)}
			/>
		</div>
	)
}
