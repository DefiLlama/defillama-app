import styled from 'styled-components'
import { ExternalLink } from 'react-feather'
import { useEffect, useState } from 'react'
import React from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { Button as ButtonComponent } from '~/components/Nav/Mobile/shared'

import logo from '~/public/llama.png'
import { CheckIcon } from './Icon'
import { useVerified } from '../hooks/useVerified'
import { llamaAddress } from '~/containers/ProApi/lib/constants'
import { SUBSCRIPTION_PRICE } from '../constants'

const Body = styled.div`
	margin-top: 120px;
	text-align: center;
	display: flex;
	justify-content: center;
	flex-direction: column;
	align-items: center;
	width: 600px;
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

const External = styled.a`
	color: #445ed0;
	text-decoration: underline;
	display: flex;
	gap: 4px;
	margin: 0 auto;
`

const ListBody = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
	align-items: center;
`

const ListItem = styled.div`
	display: flex;
	gap: 8px;
	align-items: center;
`

const PricePerMonth = styled.div`
	font-size: 32px;
	font-weight: bold;
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

const Subscribe = ({ refresh, verify }) => {
	const [isPaymentOpen, setIsPaymentOpen] = useState(false)
	const wallet = useAccount()
	const { openConnectModal } = useConnectModal()
	const { signMessage, isVerified, message } = useVerified({ verify })
	const startPayment = () => {
		window.open(
			`https://subscriptions.llamapay.io/subscribe?to=${llamaAddress}&amount=${
				SUBSCRIPTION_PRICE / 1e18
			}&brandColor=%232351be&closeAfterPayment=true`,
			'Window',
			`width=600,height=800,left=${window.screen.width / 2 - 300},top=${window.screen.height / 2 - 400}`
		)
		window.addEventListener('message', function (e) {
			if (e.data === 'payment_success') {
				setTimeout(() => refresh(), 1500)
			}
		})
	}

	const onSignClick = () => {
		signMessage({ message })
		setTimeout(() => refresh(), 1000)
	}

	return (
		<Body>
			<img src={logo.src} width="120px" height="120px" alt="logo" />
			<Content>
				<h1>DefiLlama Pro</h1>
				<PriceComponent price={100} />

				<>
					<div>
						Upgrade now for advanced DeFi analytics and insights! With DefiLlama Pro, you'll get access to a
						customizable dashboard, multiple protocols view, and more.
					</div>
				</>
				{!wallet.isConnected ? (
					<Button onClick={openConnectModal}>Connect</Button>
				) : isVerified ? (
					<Button onClick={startPayment}>{'Subscribe now'}</Button>
				) : (
					<Button onClick={onSignClick}>Sign In</Button>
				)}

				<ListBody>
					<h3>Plan Includes:</h3>
					<ListItem>
						<CheckIcon />
						Customizable dashboard with multiple protocols view
					</ListItem>
					<ListItem>
						<CheckIcon />
						Priority support
					</ListItem>
				</ListBody>
				<External href="https://twitter.com/DefiLlama" target="popup">
					Learn More <ExternalLink size={16} />
				</External>
			</Content>
		</Body>
	)
}

export default Subscribe
