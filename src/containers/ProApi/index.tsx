import React, { useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import toast from 'react-hot-toast'

import { logout, useGetAuthToken, useGetCreditsUsage, useSignInWithEthereum } from './queries/useAuth'
import { llamaAddress, subscriptionAmount } from './lib/constants'
import { useGetSubs } from './queries/useGetSubs'
import { ButtonDark } from '~/components/ButtonStyled'
import { useGenerateNewApiKey } from './queries/useGenerateKey'
import logo from '~/public/llama.png'
import Subscriptions from './Subscriptions'
import useGithubAuth from './queries/useGithubAuth'
import SignInWithGithub from './SignInWithGithub'
import { useGetCurrentKey } from './queries/useGetCurrentKey'
import { useSaveEmail } from './queries/useEmail'
import DiscordButton from './DiscordButton'
import { QuestionHelper } from '~/components/QuestionHelper'
import Link from 'next/link'
import { Icon } from '~/components/Icon'

interface Props {
	price: number
}

const PriceComponent: React.FC<Props> = ({ price }) => {
	return (
		<div className="font-bold text-3xl">
			<span style={{ color: 'gray' }}>{price}$</span> / <span style={{ fontSize: '18px' }}>month</span>
		</div>
	)
}

const ProApi = () => {
	const wallet = useAccount()
	const intervalRef = useRef<NodeJS.Timeout>()

	const { data: ghAuth } = useGithubAuth()
	const { openConnectModal } = useConnectModal()
	const { data: currentAuthToken, refetch: refetchToken } = useGetAuthToken()
	const {
		data: { subs, isSubscribed },
		refetch: refetchSubs
	} = useGetSubs({ address: wallet?.address })
	const { data: newApiKey, mutate: generateApiKey } = useGenerateNewApiKey()
	const { mutate: signInRaw } = useSignInWithEthereum()
	const { data: currentKey } = useGetCurrentKey({ authToken: currentAuthToken })
	const signIn = (data: any) => signInRaw({ ...data, refetchToken })

	const authToken = currentAuthToken || ghAuth?.apiKey
	const apiKey = newApiKey || currentKey?.apiKey || ghAuth?.apiKey

	const { mutate: saveEmail } = useSaveEmail()

	const { data: credisUsage } = useGetCreditsUsage(apiKey)

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
		<div className="flex flex-col justify-center items-center mx-auto mt-3 text-center">
			<img src={logo.src} width="120px" height="120px" alt="logo" />
			<div className="grid gap-4 mt-4">
				<h1>DefiLlama Pro API</h1>

				{authToken && isSubscribed ? null : (
					<>
						<PriceComponent price={subscriptionAmount} />
						<div>Upgrade now for increased api limits and premium api endpoints.</div>
					</>
				)}

				{ghAuth?.login ? (
					<div className="flex flex-col text-base w-full rounded-md p-4 bg-[var(--bg1)] gap-4">
						<SignInWithGithub />
					</div>
				) : authToken && isSubscribed ? null : (
					<div className="flex flex-col text-base w-full rounded-md p-4 bg-[var(--bg1)] gap-4">
						{isSubscribed ? (
							<button
								onClick={() => {
									signIn({ address: wallet.address })
								}}
								className="shadow p-2 rounded-lg bg-[#445ed0] text-base"
							>
								Sign In
							</button>
						) : (
							<>
								{!wallet.isConnected ? (
									<button onClick={openConnectModal} className="shadow p-2 rounded-lg bg-[#445ed0] text-base">
										Connect Wallet
									</button>
								) : (
									<button onClick={() => startPayment()} className="shadow p-2 rounded-lg bg-[#445ed0] text-base">
										Subscribe
									</button>
								)}
								OR
								<SignInWithGithub />
							</>
						)}
					</div>
				)}

				{!authToken || !(isSubscribed || ghAuth?.isContributor) ? (
					<>
						<h2>Pricing:</h2>
						<div className="overflow-auto text-center">
							<table className="border-collapse">
								<tbody>
									<tr>
										<th className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]"></th>
										<th className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											Free
										</th>
										<th className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											300$/mo
										</th>
										<th className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											<span className="flex items-center gap-2">
												Github Contributor
												<QuestionHelper text="Only available to users who have contributed to DefiLlama repos, lasts for 3 months" />
											</span>
										</th>
									</tr>
									<tr>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											Access to TVL, revenue/fees and prices
										</td>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											Yes
										</td>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											Yes
										</td>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											Yes
										</td>
									</tr>
									<tr>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											Access to all data (unlocks, active users, token liq...)
										</td>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											No
										</td>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											Yes
										</td>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											Yes
										</td>
									</tr>
									<tr>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											Rate limits
										</td>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											10-200 reqs/minute
										</td>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											1k reqs/minute
										</td>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											1k reqs/minute
										</td>
									</tr>
									<tr>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											Credits
										</td>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]"></td>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											1M calls/month
										</td>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											200k calls/month
										</td>
									</tr>
									<tr>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											Support
										</td>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											Public discord
										</td>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											Priority support
										</td>
										<td className="p-3 whitespace-nowrap border border-black/10 dark:border-white/10 bg-[var(--bg1)] text-[var(--text1)]">
											Priority support
										</td>
									</tr>
								</tbody>
							</table>
							<Link href="/pro-api/docs" passHref>
								<a className="text-[var(--blue)] underline">
									Click here a full lists of all endpoints available in Pro
								</a>
							</Link>
						</div>
					</>
				) : (
					<>
						<div style={{ display: 'flex', marginTop: '16px' }}>
							<h2>API Key</h2>
						</div>

						<div className="flex flex-col text-base w-full rounded-md p-4 bg-[var(--bg1)] gap-4">
							<div style={{ display: 'flex' }}>
								<h4>API Key</h4>: {apiKey || '-'}
								<span
									onClick={() => {
										navigator.clipboard.writeText(apiKey)
										toast.success('API Key copied to clipboard')
									}}
								>
									<Icon name="copy" height={16} width={16} style={{ cursor: 'pointer', marginTop: '4px' }} />
								</span>
							</div>
							{credisUsage !== undefined ? (
								<div style={{ textAlign: 'left', display: 'flex' }}>
									Calls left{'  '}
									<QuestionHelper text="Amount of calls that you can make before this api key runs out of credits. This limit will be reset at the end of each natural month." />
									: {credisUsage.creditsLeft}
								</div>
							) : null}
							{authToken && ghAuth?.isContributor ? null : (
								<div style={{ display: 'flex' }}>
									<ButtonDark
										onClick={() => {
											generateApiKey({ authToken })
										}}
										className="mr-2"
									>
										Re-roll API Key{' '}
									</ButtonDark>
									<ButtonDark onClick={() => window.open('/pro-api/docs', '_blank')} className="mr-2">
										Open API Docs{' '}
									</ButtonDark>
									<ButtonDark
										onClick={() => {
											logout({ address: wallet.address })
											refetchToken()
										}}
									>
										Log out
									</ButtonDark>
								</div>
							)}
						</div>

						{ghAuth?.login ? null : (
							<>
								<div style={{ display: 'flex', marginTop: '16px' }}>
									<h2>Personal Info</h2>
								</div>

								<div className="flex flex-col text-base w-full rounded-md p-4 bg-[var(--bg1)] gap-4">
									<div style={{ display: 'flex' }}>
										<h4>Address</h4>: {wallet?.address}
										<span
											onClick={() => {
												navigator.clipboard.writeText(wallet?.address)
												toast.success('Address copied to clipboard')
											}}
										>
											<Icon name="copy" height={16} width={16} style={{ cursor: 'pointer', marginTop: '4px' }} />
										</span>
									</div>
									<div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
										<h4>Email:</h4>
										<div style={{ display: 'flex', gap: '8px' }}>
											<input
												placeholder="Add Email..."
												value={email}
												onChange={(e) => setEmail(e.target.value)}
												className="p-[10px] border-none border-[10px] h-8 text-[var(--text1)] bg-[var(--bg7)] placeholder:text-[var(--text3)] w-full max-w-52"
											/>{' '}
											<ButtonDark onClick={() => saveEmail({ email, authToken })}>Save</ButtonDark>
										</div>
									</div>

									<p className="text-left m-auto -mt-3 w-auto mx-auto text-sm max-w-lg text-[var(--text2)]">
										We will use your email to send you important updates and notifications about your subscription.
									</p>

									<div style={{ display: 'flex', gap: '8px' }}>
										<DiscordButton />
									</div>
								</div>
							</>
						)}

						{subs?.length ? <Subscriptions startPayment={startPayment} /> : null}
					</>
				)}
			</div>
		</div>
	)
}

export default ProApi
