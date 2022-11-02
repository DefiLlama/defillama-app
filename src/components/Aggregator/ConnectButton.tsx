import { ConnectButton } from '@rainbow-me/rainbowkit'
import styled from 'styled-components'

const Wrapper = styled.div`
	position: fixed;
	right: 16px;
`

const Connect = () => {
	return (
		<Wrapper>
			<ConnectButton />
		</Wrapper>
	)
}

export default Connect
