import styled from 'styled-components'
import { ButtonLight } from '~/components/ButtonStyled'
import { DetailsWrapper } from '../ProtocolAndPool'
import { ComponentProps } from 'react'

export const ButtonSquare = ({ children, ...props }: ComponentProps<typeof ButtonLight>) => (
	<ButtonLight className="flex items-center gap-4 font-normal whitespace-nowrap w-6" {...props}>
		{children}
	</ButtonLight>
)

export const PoolDetails = styled(DetailsWrapper)`
	border-top-left-radius: 12px;

	@media screen and (min-width: 80rem) {
		max-width: 380px;
	}
`
