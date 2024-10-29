import styled from 'styled-components'
import { ButtonLight } from '~/components/ButtonStyled'
import { DetailsWrapper } from '../ProtocolAndPool'
import { ComponentProps } from 'react'

export const ButtonSquare = ({ children, ...props }: ComponentProps<typeof ButtonLight>) => (
	<ButtonLight className="flex items-center justify-center gap-4 !p-[6px]" {...props}>
		{children}
	</ButtonLight>
)

export const PoolDetails = styled(DetailsWrapper)`
	border-top-left-radius: 12px;

	@media screen and (min-width: 80rem) {
		max-width: 380px;
	}
`
