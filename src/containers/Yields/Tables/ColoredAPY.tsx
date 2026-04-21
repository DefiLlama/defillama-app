import clsx from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

interface ColoredAPYProps extends HTMLAttributes<HTMLSpanElement> {
	children: ReactNode
	className?: string
}

export const ColoredAPY = ({ children, className, ...props }: ColoredAPYProps) => {
	return (
		<span
			{...props}
			className={clsx(
				'data-[variant=borrow]:text-[#e59421] data-[variant=positive]:text-[#30c338] data-[variant=supply]:text-[#4f8fea]',
				className
			)}
		>
			{children}
		</span>
	)
}
