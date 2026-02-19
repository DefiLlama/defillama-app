import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'

/* ── Footer sub-components ──────────────────────────────────────────── */

function SocialIcons({ size }: { size: number }) {
	return (
		<div className="flex items-center gap-2">
			<a href="https://discord.defillama.com" target="_blank" rel="noopener noreferrer" aria-label="Discord" className="rounded-full p-1 text-(--sub-social-icon)">
				<Icon name="chat" height={size} width={size} aria-hidden="true" />
			</a>
			<a href="https://twitter.com/DefiLlama" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="rounded-full p-1 text-(--sub-social-icon)">
				<Icon name="twitter" height={size} width={size} aria-hidden="true" />
			</a>
			<a href="https://github.com/DefiLlama" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="rounded-full p-1 text-(--sub-social-icon)">
				<Icon name="github" height={size} width={size} aria-hidden="true" />
			</a>
		</div>
	)
}

function FooterLinks() {
	return (
		<>
			<a href="mailto:support@defillama.com">Contact Us</a>
			<BasicLink href="/privacy-policy">Privacy Policy</BasicLink>
			<BasicLink href="/subscription/fulfillment-policies">Fulfillment Policies</BasicLink>
			<BasicLink href="/terms">Terms of Service</BasicLink>
		</>
	)
}

/* ── SubscriptionFooter ────────────────────────────────────────────── */

export function SubscriptionFooter() {
	return (
		<>
			{/* Mobile */}
			<footer className="px-4 pb-6 md:hidden">
				<div className="h-px w-full bg-(--sub-desktop-table-border)" />
				<div className="mt-6 flex items-center justify-between">
					<div className="flex flex-col items-start">
						<img
							src="/assets/defillama-dark-neutral.webp"
							alt="DefiLlama"
							className="h-7 w-auto object-contain object-left dark:hidden"
						/>
						<img
							src="/assets/defillama.webp"
							alt="DefiLlama"
							className="hidden h-7 w-auto object-contain object-left dark:block"
						/>
					</div>
					<SocialIcons size={18} />
				</div>
				<div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] leading-3 text-(--sub-footer-text)">
					<FooterLinks />
				</div>
				<p className="mt-4 text-[10px] leading-3 text-(--sub-footer-text)">&copy; {new Date().getFullYear()} DefiLlama. All rights reserved.</p>
			</footer>

			{/* Desktop */}
			<footer className="hidden px-[128px] pb-8 md:block">
				<div className="h-px w-full bg-(--sub-desktop-table-border)" />
				<div className="mt-8 flex flex-col gap-6">
					<div className="flex items-center justify-between">
						<div className="flex flex-col items-start">
							<img
								src="/assets/defillama-dark.webp"
								alt="DefiLlama"
								className="h-7 w-[83px] object-contain object-left dark:hidden"
							/>
							<img
								src="/assets/defillama.webp"
								alt="DefiLlama"
								className="hidden h-7 w-[83px] object-contain object-left dark:block"
							/>
						</div>
						<SocialIcons size={20} />
					</div>
					<div className="flex items-center justify-between text-xs text-(--sub-footer-text)">
						<p>&copy; {new Date().getFullYear()} DefiLlama. All rights reserved.</p>
						<div className="flex items-center gap-8">
							<FooterLinks />
						</div>
					</div>
				</div>
			</footer>
		</>
	)
}
