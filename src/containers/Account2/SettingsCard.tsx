import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useAccount, useSignMessage } from 'wagmi'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useDevOverrides } from './DevToolbar' // [DEV-TOOLBAR] remove before production
import { ToggleSwitch } from './ToggleSwitch'

export function SettingsCard() {
	const dev = useDevOverrides() // [DEV-TOOLBAR] remove before production
	const realAuth = useAuthContext()
	const { user, addWallet, setPromotionalEmails, loaders } = dev?.auth ?? realAuth // [DEV-TOOLBAR] revert to: const { user, addWallet, setPromotionalEmails, loaders } = useAuthContext()
	const { address } = useAccount()
	const { signMessageAsync } = useSignMessage()
	const { openConnectModal } = useConnectModal()

	const promoEmailsOn = user?.promotionalEmails === 'on' || user?.promotionalEmails === 'initial'

	const handleConnectWallet = () => {
		if (!address) {
			openConnectModal?.()
			return
		}
		addWallet(address, signMessageAsync).catch(() => {})
	}

	const handleTogglePromoEmails = () => {
		if (loaders.setPromotionalEmails) return
		setPromotionalEmails(promoEmailsOn ? 'off' : 'on')
	}

	return (
		<div className="flex flex-col gap-4 rounded-2xl border border-(--sub-c-ced8e6) bg-white p-4 dark:border-(--sub-c-2f3336) dark:bg-(--sub-c-131516)">
			<div className="flex items-center gap-2">
				<Icon name="gear-settings" height={28} width={28} className="text-(--sub-c-090b0c) dark:text-white" />
				<span className="text-base font-medium text-(--sub-c-090b0c) dark:text-white">Settings</span>
			</div>

			<div className="flex flex-col gap-4">
				{/* Airdrop Eligibility — hidden for now, we don't want to force users to add wallets yet
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<span className="text-sm text-(--sub-c-090b0c) dark:text-white">Airdrop Eligibility</span>
						<button
							onClick={handleConnectWallet}
							disabled={loaders.addWallet}
							className="rounded-lg border border-(--sub-c-dedede) px-3 py-2 text-xs font-medium text-(--sub-c-090b0c) disabled:opacity-50 dark:border-(--sub-c-2f3336) dark:text-white"
						>
							{loaders.addWallet ? 'Connecting...' : 'Connect Wallet'}
						</button>
					</div>
					<p className="max-w-[400px] text-xs leading-4 text-(--sub-c-878787)">
						Connect your active wallets to track potential rewards from DeFi protocols. Please note that this
						wallet will not work as an authentication method.
					</p>
				</div>
				*/}

				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<span className="text-sm text-(--sub-c-090b0c) dark:text-white">
							Receive promotional emails
						</span>
						<ToggleSwitch
							checked={promoEmailsOn}
							onClick={handleTogglePromoEmails}
							disabled={loaders.setPromotionalEmails}
							aria-label="Receive promotional emails"
						/>
					</div>
					<p className="max-w-[400px] text-xs leading-4 text-(--sub-c-878787)">
						Receive emails about upcoming DefiLlama products and new release
					</p>
				</div>
			</div>
		</div>
	)
}
