import styled from 'styled-components'
import React, { useEffect, useRef } from 'react'
import { useAccount, useNetwork, useSwitchNetwork } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { Copy } from 'react-feather'
import toast from 'react-hot-toast'

import { Button as ButtonComponent } from '~/components/Nav/Mobile/shared'
import { CheckIcon } from '../ProContainer/Subscribe/Icon'
import { useGetAuthToken, useSignInWithEthereum } from './queries/useAuth'
import { llamaAddress, subscriptionAmount } from './lib/constants'
import { useGetSubs } from './queries/useGetSubs'
import { ButtonDark, ButtonLight } from '~/components/ButtonStyled'
import { useGenerateNewApiKey } from './queries/useGenerateKey'
import logo from '~/public/llama.png'
import Subscriptions from './Subscriptions'
import useGithubAuth from './queries/useGithubAuth'
import SignInWithGithub from './SignInWithGithub'
import { useGetCurrentKey } from './queries/useGetCurrentKey'
import { Description } from '~/components/Correlations/styles'
import { useSaveEmail } from './queries/useEmail'
import DiscordButton from './DiscordButton'

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

export const Box = styled.div`
	display: flex;
	flex-direction: column;
	font-size: 16px;
	width: 100%;
	border-radius: 10px;
	transition: all 0.3s ease;
	padding: 15px;
	background-color: ${({ theme }) => theme.bg1};
	color: ${({ theme }) => theme.text1};
	gap: 16px;
`

const Input = styled.input`
	padding: 10px;
	border: none;
	border-radius: 10px;
	height: 32px;
	color: ${({ theme }) => theme.text1};
	background-color: ${({ theme }) => theme.bg7};

	&:focus {
		outline: none;
	}

	&::placeholder {
		color: ${({ theme }) => theme.text3};
	}

	width: 200px;
`

const ProApi = () => {
	const wallet = useAccount()
	const intervalRef = useRef<NodeJS.Timeout>()

	const { data: ghAuth } = useGithubAuth()
	const { openConnectModal } = useConnectModal()
	const { data: currentAuthToken } = useGetAuthToken()
	const {
		data: { subs, isSubscribed },
		refetch: refetchSubs
	} = useGetSubs({ address: wallet?.address })
	const { data: newApiKey, mutate: generateApiKey } = useGenerateNewApiKey()
	const { data: authTokenAfterSigningIn, mutate: signIn } = useSignInWithEthereum()
	const { data: currentKey } = useGetCurrentKey({ authToken: currentAuthToken })

	const authToken = currentAuthToken || authTokenAfterSigningIn || ghAuth?.apiKey
	const apiKey = newApiKey || currentKey?.apiKey || ghAuth?.apiKey

	const { mutate: saveEmail } = useSaveEmail({ authToken })

	const [email, setEmail] = React.useState(currentKey?.email)

	useEffect(() => {
		if (currentKey?.email) {
			setEmail(currentKey?.email)
		}
	}, [currentKey?.email])

	const startPayment = (isTopUp = false) => {
		window.open(
			`https://subscriptions.llamapay.io/subscribe?to=${llamaAddress}&amount=${subscriptionAmount}&brandColor=%232351be&closeAfterPayment=true`,
			'Window',
			`width=600,height=800,left=${window.screen.width / 2 - 300},top=${window.screen.height / 2 - 400}`
		)
		window.addEventListener('message', function (e) {
			if (e.data === 'payment_success' && !isTopUp) {
				signIn({ address: wallet.address })
				intervalRef.current = setInterval(() => refetchSubs(), 500)
			}
		})
	}

	useEffect(() => {
		return () => {
			if (intervalRef.current && isSubscribed) {
				clearInterval(intervalRef.current)
			}
		}
	}, [isSubscribed])

	return (
		<Body>
			<img src={logo.src} width="120px" height="120px" alt="logo" />
			<Content>
				<div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
					<h1>DefiLlama Pro API</h1>
				</div>
				{authToken && isSubscribed ? null : (
					<>
						<PriceComponent price={subscriptionAmount} />
						<div>Upgrade now for increased api limits and premium api endpoints.</div>
					</>
				)}

				{ghAuth?.login ? (
					<Box>
						<SignInWithGithub />
					</Box>
				) : authToken && isSubscribed ? null : (
					<Box>
						{!wallet.isConnected ? (
							<Button onClick={openConnectModal}>Connect Wallet</Button>
						) : !isSubscribed ? (
							<Button onClick={() => startPayment()}>Subscribe</Button>
						) : authToken ? null : (
							<Button
								onClick={() => {
									signIn({ address: wallet.address })
								}}
							>
								Sign In
							</Button>
						)}
						OR
						<SignInWithGithub />
					</Box>
				)}

				{/* {!authToken || !isSubscribed ? (
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
				) : ( */}
				<>
					<div style={{ display: 'flex', marginTop: '16px' }}>
						<h2>API Key</h2>
					</div>

					<Box>
						<div style={{ display: 'flex' }}>
							<h4>API Key</h4>: {apiKey || '-'}
							<span
								onClick={() => {
									navigator.clipboard.writeText(apiKey)
									toast.success('API Key copied to clipboard')
								}}
							>
								<Copy style={{ height: '16px', cursor: 'pointer', marginTop: '4px' }} />
							</span>
						</div>
						{authToken && ghAuth?.isContributor ? null : (
							<div style={{ display: 'flex' }}>
								<ButtonDark
									onClick={() => {
										generateApiKey({ authToken })
									}}
									style={{ width: '120px', marginRight: '0.5em' }}
								>
									Re-roll API Key{' '}
								</ButtonDark>
								<ButtonDark onClick={() => window.open('/pro-api/docs', '_blank')}>Open API Docs </ButtonDark>
							</div>
						)}
					</Box>

					{ghAuth?.login ? null : (
						<>
							<div style={{ display: 'flex', marginTop: '16px' }}>
								<h2>Personal Info</h2>
							</div>

							<Box>
								<div style={{ display: 'flex' }}>
									<h4>Address</h4>: {wallet?.address}
									<span
										onClick={() => {
											navigator.clipboard.writeText(wallet?.address)
											toast.success('Address copied to clipboard')
										}}
									>
										<Copy style={{ height: '16px', cursor: 'pointer', marginTop: '4px' }} />
									</span>
								</div>
								<div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
									<h4>Email:</h4>
									<div style={{ display: 'flex', gap: '8px' }}>
										<Input placeholder="Add Email..." value={email} onChange={(e) => setEmail(e.target.value)} />{' '}
										<ButtonDark onClick={() => saveEmail({ email, authToken })}>Save</ButtonDark>
									</div>
								</div>
								<div>
									<Description style={{ textAlign: 'left', margin: 'auto', width: 'auto', marginTop: '-12px' }}>
										We will use your email to send you important updates and notifications about your subscription.
									</Description>
								</div>
								<div style={{ display: 'flex', gap: '8px' }}>
									<DiscordButton />
								</div>
							</Box>
						</>
					)}

					{subs?.length ? <Subscriptions startPayment={startPayment} /> : null}
				</>
				{/* )} */}
				<></>
			</Content>
		</Body>
	)
}

export default ProApi
