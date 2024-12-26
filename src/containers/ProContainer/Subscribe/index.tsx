import { useState } from 'react'
import React from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'

import logo from '~/public/llama.png'
import { CheckIcon } from './Icon'
import { useVerified } from '../hooks/useVerified'
import { llamaAddress } from '~/containers/ProApi/lib/constants'
import { SUBSCRIPTION_PRICE } from '../constants'
import { Icon } from '~/components/Icon'

interface Props {
	price: number
}

const PriceComponent: React.FC<Props> = ({ price }) => {
	return (
		<div className="font-bold text-[32px]">
			<span style={{ color: 'gray' }}>{price}$</span> / <span style={{ fontSize: '18px' }}>month</span>
		</div>
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
		// signMessage({ message })
		// setTimeout(() => refresh(), 1000)
	}

	return (
		<div className="mt-[120px] text-center flex flex-col justify-center items-center w-full max-w-[600px] mx-auto">
			<img src={logo.src} width="120px" height="120px" alt="logo" />
			<div className="mt-4 grid gap-4">
				<h1>DefiLlama Pro</h1>
				<PriceComponent price={100} />

				<>
					<div>
						Upgrade now for advanced DeFi analytics and insights! With DefiLlama Pro, you'll get access to a
						customizable dashboard, multiple protocols view, and more.
					</div>
				</>
				{!wallet.isConnected ? (
					<button onClick={openConnectModal} className="shadow p-2 rounded-lg bg-[#445ed0] text-base">
						Connect
					</button>
				) : isVerified ? (
					<button onClick={startPayment}>{'Subscribe now'}</button>
				) : (
					<button onClick={onSignClick} className="shadow p-2 rounded-lg bg-[#445ed0] text-base">
						Sign In
					</button>
				)}

				<div className="flex flex-col items-center gap-2">
					<h3>Plan Includes:</h3>
					<div className="flex items-center gap-2">
						<CheckIcon />
						Customizable dashboard with multiple protocols view
					</div>
					<div className="flex items-center gap-2">
						<CheckIcon />
						Priority support
					</div>
				</div>
				<a
					href="https://twitter.com/DefiLlama"
					target="popup"
					className="underline flex mx-auto gap-1 items-center text-[var(--link)]"
				>
					Learn More <Icon name="external-link" height={16} width={16} />
				</a>
			</div>
		</div>
	)
}

export default Subscribe
