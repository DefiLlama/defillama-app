import styled from 'styled-components'
import React from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import dayjs from 'dayjs'
import { Copy } from 'react-feather'

import { Button as ButtonComponent } from '~/components/Nav/Mobile/shared'
import { CheckIcon } from '../ProContainer/Subscribe/Icon'
import { useGetAuthToken, useSignInWithEthereum } from './queries/useAuth'
import { llamaAddress, subscriptionAmount } from './lib/constants'
import { useGetSubs } from './queries/useGetSubs'
import { ButtonDark, ButtonLight } from '~/components/ButtonStyled'
import { useGenerateNewApiKey } from './queries/useGenerateKey'
import logo from '~/public/llama.png'

const Body = styled.div`
	margin-top: 120px;
	text-align: center;
	display: flex;
	justify-content: center;
	flex-direction: column;
	align-items: center;
	margin: 0 auto;
`

const Content = styled.div`
	margin-top: 16px;
	display: grid;
	gap: 16px;
`

const Button = styled(ButtonComponent)`
	font-size: 16px;
	height: 36px;
`

const ListBody = styled.div`
	display: flex;
	flex-direction: column;
	gap: 12px;
	align-items: center;
`

const ListItem = styled.div`
	display: flex;
	gap: 8px;
	font-size: 16px;
	align-items: center;
`

const PricePerMonth = styled.div`
	font-size: 32px;
	font-weight: bold;
`

const Buttons = styled.div`
	display: flex;
	gap: 16px;
	width: 100%;
	justify-content: center;

	button {
		width: 100%;
	}
`

interface Props {
	price: number
}

const PriceComponent: React.FC<Props> = ({ price }) => {
	return (
		<PricePerMonth>
			<span style={{ color: 'gray' }}>{price}$</span> / <span style={{ fontSize: '18px' }}>month</span>
		</PricePerMonth>
	)
}

const ProApi = () => {
	const wallet = useAccount()
	const { openConnectModal } = useConnectModal()
	const { data: currentAuthToken } = useGetAuthToken()
	const { data: subs } = useGetSubs({ address: wallet?.address })
	const { data: newApiKey, mutate: generateApiKey } = useGenerateNewApiKey()
	const { data: authTokenAfterSigningIn, mutate: signIn } = useSignInWithEthereum()
	const authToken = currentAuthToken || authTokenAfterSigningIn

	const startPayment = () => {
		const paymentWindow = window.open(
			`https://subscriptions.llamapay.io/subscribe?to=${llamaAddress}&amount=${subscriptionAmount}&brandColor=%232351be&closeAfterPayment=true`,
			'Window',
			`width=600,height=800,left=${window.screen.width / 2 - 300},top=${window.screen.height / 2 - 400}`
		)

		const timer = setInterval(function () {
			if (paymentWindow.closed) {
				clearInterval(timer)
				signIn({ address: wallet.address })
			}
		}, 1000)
	}

	return (
		<Body>
			<img src={logo.src} width="120px" height="120px" alt="logo" />
			<Content>
				<h1>DefiLlama Pro API</h1>
				{authToken ? null : (
					<>
						<PriceComponent price={300} />
						<div>Upgrade now for increased api limits and premium api endpoints.</div>
					</>
				)}

				{!wallet.isConnected ? (
					<Button onClick={openConnectModal}>Connect</Button>
				) : !authToken && !(subs?.[0]?.realExpiration > new Date().getTime() / 1000) ? (
					<Button onClick={startPayment}>Subscribe</Button>
				) : authToken ? (
					<Buttons>
						<ButtonLight onClick={() => window.open('/pro-api/docs', '_blank')}>Open API Docs </ButtonLight>
						<ButtonDark onClick={() => generateApiKey({ authToken })}>Generate new API Key </ButtonDark>
					</Buttons>
				) : (
					<Button onClick={() => signIn({ address: wallet.address })}>Sign In</Button>
				)}

				{!authToken ? (
					<ListBody>
						<h2>Plan Includes:</h2>
						<ListItem>
							<CheckIcon />
							Increased API limits
						</ListItem>
						<ListItem>
							<CheckIcon />
							Access to premium API endpoints
						</ListItem>
					</ListBody>
				) : (
					<ListBody>
						<h2>Subscription Info</h2>
						<ListItem>
							<h4>API Key</h4>: {newApiKey || authToken || 'Not Subscribed'}
							<span onClick={() => navigator.clipboard.writeText('Copy this text to clipboard')}>
								<Copy style={{ height: '16px', cursor: 'pointer' }} />
							</span>
						</ListItem>
						<ListItem>
							<h4>Expiration Date</h4>:{' '}
							{subs?.[0]?.realExpiration
								? dayjs(subs?.[0]?.realExpiration * 1000).format('MMM D, YYYY')
								: 'Not Subscribed'}
						</ListItem>
					</ListBody>
				)}
			</Content>
		</Body>
	)
}

export default ProApi
