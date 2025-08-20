import Head from 'next/head'
import { BasicLink } from '~/components/Link'
import { SEO } from '~/components/SEO'

export default function FulfillmentPolicies() {
	return (
		<SubscribeLayout2>
			<div className="mx-auto mb-[64px] flex w-full max-w-xl flex-col gap-8 text-[#d5d5d5]">
				<h1 className="text-center text-3xl font-bold text-white">Fulfillment Policies</h1>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">Refund Policy</h2>
					<p>
						If you haven't made any request to the API yet and all your credits are unused, please send an email to{' '}
						<a href="mailto:support@defillama.com" className="underline">
							support@defillama.com
						</a>{' '}
						and we'll refund your payment. In case you've already made any API request, no refunds will be given, but
						you can still cancel your subscription.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">Cancellation Policy</h2>
					<p>You can cancel your subscription at any time.</p>
				</div>
			</div>
		</SubscribeLayout2>
	)
}

export function SubscribeLayout2({ children }) {
	return (
		<>
			<Head>
				<title>Subscribe - DefiLlama</title>
				<link rel="icon" type="image/png" href="/favicon-32x32.png" />
			</Head>
			<SEO />
			<div className="col-span-full flex w-full flex-col bg-[oklch(0.148_0.004_228.8)]">
				<header className="flex min-h-[64px] items-center justify-end gap-4 px-5 py-3"></header>
				{children}
				<footer className="mt-auto flex flex-wrap items-center justify-center gap-4 px-5 py-3 text-[#8a8c90]">
					<a href="https://discord.defillama.com" className="underline">
						Discord
					</a>
					<a href="mailto:support@defillama.com" className="underline">
						Contact Us
					</a>

					<BasicLink href="/subscription/privacy-policy" className="underline">
						Privacy Policy
					</BasicLink>

					<BasicLink href="/subscription/fulfillment-policies" className="underline">
						Fulfillment policies
					</BasicLink>

					<BasicLink href="/terms" className="underline">
						Terms of Service
					</BasicLink>
				</footer>
			</div>
		</>
	)
}
