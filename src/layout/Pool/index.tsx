import styled from 'styled-components'
import { ButtonLight } from '~/components/ButtonStyled'
import { DetailsWrapper } from '../ProtocolAndPool'

export const ButtonYields = styled(ButtonLight)`
	display: flex;
	gap: 4px;
	align-items: center;
	padding: 4px 6px;
	font-size: 0.875rem;
	font-weight: 400;
	white-space: nowrap;
	font-family: var(--font-inter);
`

export const PoolDetails = styled(DetailsWrapper)`
	border-top-left-radius: 12px;

	@media screen and (min-width: 80rem) {
		max-width: 380px;
	}
`
