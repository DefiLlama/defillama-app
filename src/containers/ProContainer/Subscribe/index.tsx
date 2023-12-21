import styled from 'styled-components'
import logo from '~/public/llama.png'
import { Button as ButtonComponent } from '~/components/Nav/Mobile/shared'
import { ExternalLink } from 'react-feather'
import { useState } from 'react'
import React from 'react'
import { useVerified } from '../hooks'

const Body = styled.div`
	margin-top: 120px;
	text-align: center;
	display: flex;
	justify-content: center;
	flex-direction: column;
	align-items: center;
	width: 100vh;
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

const Subscribe = ({ refresh, verify }) => {
	const [isPaymentOpen, setIsPaymentOpen] = useState(false)
	const { signMessage, isVerified, message } = useVerified({ verify })

	const startPayment = () => {
		if (isPaymentOpen) {
			setIsPaymentOpen(false)
			return
		}
		setIsPaymentOpen(true)

		window.addEventListener(
			'message',
			(event) => {
				if (event.data.subscribed === true) {
					setIsPaymentOpen(false)
					setTimeout(() => refresh(), 1000)
				}
			},
			false
		)
	}

	const onSignClick = () => {
		signMessage({ message })
		setTimeout(() => refresh(), 1000)
	}

	return (
		<Body>
			<img src={logo.src} width="120px" height="120px" alt="logo" />
			<Content>
				<h2>DefiLlama Pro</h2>
				{isPaymentOpen ? null : (
					<>
						<h3>You don't have active subscription</h3>
						<div>
							Upgrade now for advanced DeFi analytics and insights! With DefiLlama Pro, you'll get access to a
							customizable dashboard, multiple protocols view, and more.
						</div>
					</>
				)}
				{isVerified ? (
					<Button onClick={startPayment}>{isPaymentOpen ? 'Close' : 'Subscribe'}</Button>
				) : (
					<Button onClick={onSignClick}>Sign In</Button>
				)}
				{isPaymentOpen ? (
					<iframe
						height={800}
						width={500}
						src={
							'https://subscriptions.llamapay.io/subscribe?to=0x08a3c2A819E3de7ACa384c798269B3Ce1CD0e437&amount=0.1&brandColor=%232351be'
						}
					/>
				) : null}

				<External href="https://twitter.com/DefiLlama" target="popup">
					Learn More <ExternalLink size={16} />
				</External>
			</Content>
		</Body>
	)
}

export default Subscribe
