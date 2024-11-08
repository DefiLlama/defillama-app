import { ButtonLight } from '~/components/ButtonStyled'
import { ComponentProps } from 'react'

export const ButtonSquare = ({ children, ...props }: ComponentProps<typeof ButtonLight>) => (
	<ButtonLight className="flex items-center justify-center gap-4 !p-[6px]" {...props}>
		{children}
	</ButtonLight>
)
