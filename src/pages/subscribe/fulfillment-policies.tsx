import { SubscribeLayout } from '~/containers/Subscribe/Layout'

export default function FulfillmentPolicies() {
	return (
		<SubscribeLayout>
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
		</SubscribeLayout>
	)
}
