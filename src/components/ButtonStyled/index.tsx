import { darken, transparentize } from 'polished'
import { ComponentProps, ElementType, forwardRef, ReactNode } from 'react'
import { primaryColor } from '~/constants/colors'

const defaultButtonType = 'button' as const
type ButtonDefaultAsType = typeof defaultButtonType
type ButtonOwnProps<E extends ElementType> = {
	children: ReactNode
	as?: E
	color?: string
	useTextColor?: boolean
}
type ButtonProps<E extends ElementType> = ButtonOwnProps<E> & Omit<ComponentProps<E>, keyof ButtonOwnProps<E>>

export const ButtonDark = <E extends ElementType = ButtonDefaultAsType>({
	children,
	as,
	className,
	style,
	...props
}: ButtonProps<E>) => {
	const Tag = as || defaultButtonType

	return (
		<Tag
			style={
				{
					'--bg-light': '#445ed0',
					'--bg-dark': primaryColor,
					'--bg-active-light': darken(0.1, '#445ed0'),
					'--bg-active-dark': darken(0.1, primaryColor),
					...(style ?? {})
				} as any
			}
			className={`min-w-fit rounded-md bg-(--bg-light) px-3 py-2 whitespace-nowrap text-white hover:bg-(--bg-active-light) focus-visible:bg-(--bg-active-light) dark:bg-(--bg-dark) dark:hover:bg-(--bg-active-dark) dark:focus-visible:bg-(--bg-active-dark) ${
				className ?? ''
			}`}
			{...props}
		>
			{children}
		</Tag>
	)
}

export const ButtonLight = forwardRef(function BLight<E extends ElementType = ButtonDefaultAsType>(
	{ children, as, color, useTextColor, style, className, ...props }: ButtonProps<E>,
	ref
) {
	const Tag = as || defaultButtonType

	return (
		<Tag
			style={
				{
					...(color
						? {
								'--btn2-bg': transparentize(0.9, color),
								'--btn2-hover-bg': transparentize(0.8, color),
								'--btn2-text': darken(0.1, color)
							}
						: {}),
					...(style ?? {})
				} as any
			}
			className={`flex min-w-fit items-center gap-1 rounded-md bg-(--btn2-bg) px-3 py-2 whitespace-nowrap hover:bg-(--btn2-hover-bg) ${
				useTextColor ? 'text-(--text-primary)' : 'text-(--btn2-text)'
			} ${className ?? ''}`}
			ref={ref}
			{...props}
		>
			{children}
		</Tag>
	)
})

export const GrayButton = <E extends ElementType = ButtonDefaultAsType>({
	children,
	as,
	className,
	style,
	...props
}: ButtonProps<E>) => {
	const Tag = as || defaultButtonType

	return (
		<Tag
			style={
				{
					'--bg-light': '#eaeaea',
					'--bg-dark': '#22242a',
					'--bg-active-light': darken(0.1, '#eaeaea'),
					'--bg-active-dark': darken(0.1, '#22242a'),
					...(style ?? {})
				} as any
			}
			className={`min-w-fit rounded-md bg-(--bg-light) px-3 py-2 whitespace-nowrap text-white hover:bg-(--bg-active-light) focus-visible:bg-(--bg-active-light) dark:bg-(--bg-dark) dark:hover:bg-(--bg-active-dark) dark:focus-visible:bg-(--bg-active-dark) ${
				className ?? ''
			}`}
			{...props}
		>
			{children}
		</Tag>
	)
}
