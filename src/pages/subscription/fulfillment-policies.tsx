import Head from 'next/head'
import { BasicLink } from '~/components/Link'
import { SEO } from '~/components/SEO'

export default function FulfillmentPolicies() {
	return (
		<SubscribeLayout2>
			<div className="mb-[64px] flex flex-col gap-8 w-full max-w-xl mx-auto text-[#d5d5d5]">
				<h1 className="text-3xl text-center text-white font-bold">Fulfillment Policies</h1>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl text-white font-semibold">Refund Policy</h2>
					<p>
						If you haven't made any request to the API yet and all your credits are unused, please send an email to{' '}
						<a href="mailto:support@llama.fi" className="underline">
							support@llama.fi
						</a>{' '}
						and we'll refund your payment. In case you've already made any API request, no refunds will be given, but
						you can still cancel your subscription.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl text-white font-semibold">Cancellation Policy</h2>
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
			<div className="col-span-full w-full flex flex-col">
				<header className="min-h-[64px] py-3 px-5 flex items-center justify-end gap-4"></header>
				{children}
				<footer className="mt-auto py-3 px-5 flex flex-wrap items-center justify-center gap-4 text-[#8a8c90]">
					<a href="https://discord.defillama.com" className="underline">
						Discord
					</a>
					<a href="mailto:support@llama.fi" className="underline">
						Contact Us
					</a>

					<BasicLink href="/subscription/privacy-policy" className="underline">
						Privacy Policy
					</BasicLink>

					<BasicLink href="/subscription/fulfillment-policies" className="underline">
						Fulfillment policies
					</BasicLink>
				</footer>
			</div>
		</>
	)
}
