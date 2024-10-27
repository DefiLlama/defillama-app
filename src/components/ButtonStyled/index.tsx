import { darken, transparentize } from 'polished'
import { ComponentProps, ElementType, ReactNode } from 'react'

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
					'--bg-dark': '#2172E5',
					'--bg-active-light': darken(0.1, '#445ed0'),
					'--bg-active-dark': darken(0.1, '#2172E5'),
					...(style ?? {})
				} as any
			}
			className={`py-2 px-3 text-sm font-semibold rounded-xl text-white min-w-fit bg-[var(--bg-light)] dark:bg-[var(--bg-dark)] whitespace-nowrap hover:bg-[var(--bg-active-light)] dark:hover:bg-[var(--bg-active-dark)] focus-visible:bg-[var(--bg-active-light)] dark:focus-visible:bg-[var(--bg-active-dark)] ${
				className ?? ''
			}`}
			{...props}
		>
			{children}
		</Tag>
	)
}

export const ButtonLight = <E extends ElementType = ButtonDefaultAsType>({
	children,
	as,
	color,
	useTextColor,
	style,
	className,
	...props
}: ButtonProps<E>) => {
	const Tag = as || defaultButtonType

	return (
		<Tag
			style={
				{
					'--bg-light': transparentize(0.9, color ?? '#445ed0'),
					'--bg-dark': transparentize(0.9, color ?? '#2172E5'),
					'--bg-active-light': transparentize(0.8, color ?? '#2172E5'),
					'--bg-active-dark': transparentize(0.8, color ?? '#2172E5'),
					'--text-light': useTextColor ? '#1F1F1F' : color ? darken(0.1, color) : '#445ed0',
					'--text-dark': useTextColor ? '#FAFAFA' : color ? darken(0.1, color) : '#2172E5',
					...(style ?? {})
				} as any
			}
			className={`py-2 px-3 text-sm font-semibold rounded-xl text-[var(--text-white)] dark:text-[var(--text-dark)] hover:text-[var(--text-white)] hover:dark:text-[var(--text-dark)] focus-visible:text-[var(--text-white)] focus-visible:dark:text-[var(--text-dark)] min-w-fit bg-[var(--bg-light)] dark:bg-[var(--bg-dark)] whitespace-nowrap hover:bg-[var(--bg-active-light)] dark:hover:bg-[var(--bg-active-dark)] focus-visible:bg-[var(--bg-active-light)] dark:focus-visible:bg-[var(--bg-active-dark)] ${
				className ?? ''
			}`}
			{...props}
		>
			{children}
		</Tag>
	)
}

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
			className={`py-2 px-3 text-sm font-semibold rounded-xl text-white min-w-fit bg-[var(--bg-light)] dark:bg-[var(--bg-dark)] whitespace-nowrap hover:bg-[var(--bg-active-light)] dark:hover:bg-[var(--bg-active-dark)] focus-visible:bg-[var(--bg-active-light)] dark:focus-visible:bg-[var(--bg-active-dark)] ${
				className ?? ''
			}`}
			{...props}
		>
			{children}
		</Tag>
	)
}
