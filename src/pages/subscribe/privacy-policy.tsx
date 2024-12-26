import { SubscribeLayout } from '~/containers/Subscribe/Layout'

export default function PrivacyPolicy() {
	return (
		<SubscribeLayout>
			<div className="mb-[64px] flex flex-col gap-8 w-full max-w-3xl mx-auto text-[#d5d5d5]">
				<h1 className="text-3xl text-center text-white font-bold">Privacy Policy</h1>
				<p>
					This Privacy Policy explains how information about you is collected, used, and disclosed by DefiLlama. This
					Privacy Policy applies to information we collect when you use the website operated by us and located at{' '}
					<a href="https://llama.fi" className="underline">
						https://llama.fi
					</a>
					, or when you otherwise interact with the services or tools we provide.
				</p>

				<p>
					We may change this Privacy Policy from time to time. If we make changes, we will notify you by revising the
					date at the top of the policy and, in some cases, we may provide you with additional notice (such as adding a
					statement to our homepage or sending you a notification).
				</p>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl text-white font-semibold">1. Collection of Information.</h2>
					<p>
						<span className="text-white font-medium">1.1</span> Information You Provide to Us. We collect information
						you provide directly to us. The types of information we may collect include your digital asset wallet
						address, your email, completed transaction hashes, and the token names, symbols, or other blockchain
						identifiers.
					</p>
					<div>
						<p>
							<span className="text-white font-medium">1.2</span> Information We Collect Automatically When You Use the
							Services. When you access or use our Services, we may automatically collect information about you,
							including:
						</p>
						<ul className="flex flex-col list-disc pl-4">
							<li>
								Log Information: We may collect log information about your use of the Website, including the type of
								browser you use, access times, pages viewed, your IP address and the page you visited before navigating
								to our Website.
							</li>
							<li>
								Device Information: We may collect information about the computer or mobile device you use to access the
								Website, including the hardware model, operating system and version, unique device identifiers and
								mobile network information.
							</li>
						</ul>
					</div>
					<p>
						<span className="text-white font-medium">1.3</span> Information Collected by Cookies and Other Tracking
						Technologies. We may use various technologies to collect information, including cookies and web beacons.
						Cookies are small data files stored on your hard drive or in device memory that help us improve our services
						and your experience, see which areas and features of our services are popular and count visits. Web beacons
						are electronic images that may be used in our services or emails and help deliver cookies, count visits and
						understand usage and campaign effectiveness. For more information about cookies, and how to disable them,
						please see “Your Choices” below.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl text-white font-semibold">2. Use of Information.</h2>
					<div>
						<p>
							<span className="text-white font-medium">2.1</span> We may use information about you for various purposes,
							including to:
						</p>
						<ul className="flex flex-col list-disc pl-4">
							<li>Provide, maintain and improve our services;</li>
							<li>Send you technical notices, updates, security alerts and administrative messages;</li>
							<li>Respond to your comments, questions and requests;</li>
							<li>
								Communicate with you about products, services, offers and events offered by us and others, and provide
								news and information we think will be of interest to you;
							</li>
							<li>Monitor and analyze trends, usage and activities in connection with our services;</li>
							<li>
								Detect, investigate and prevent fraudulent transactions and other illegal activities and protect the
								rights and property of us and others;
							</li>
							<li>
								Personalize and improve the services and provide content or features that match user profiles or
								interests; and
							</li>
							<li>Carry out any other purpose described to you at the time the information was collected.</li>
						</ul>
					</div>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl text-white font-semibold">3. Sharing of Information.</h2>
					<div>
						<p>
							<span className="text-white font-medium">3.1</span> We may use share information about you as follows or
							as otherwise described in this Privacy Policy:
						</p>
						<ul className="flex flex-col list-disc pl-4">
							<li>
								With vendors, consultants and other service providers who need access to such information to carry out
								work on our behalf;
							</li>
							<li>
								In response to a request for information if we believe disclosure is in accordance with, or required by,
								any applicable law, regulation or legal process;
							</li>
							<li>
								If we believe your actions are inconsistent with our user agreements or policies, or to protect the
								rights, property and safety of us, or others;
							</li>
							<li>
								In connection with, or during negotiations of, any merger, sale of company assets, financing or
								acquisition of all or a portion of our business by another company;
							</li>
							<li>
								Between and among our current and future parents, affiliates, subsidiaries and other companies under
								common control and ownership; and
							</li>
							<li>With your consent or at your direction.</li>
						</ul>
					</div>
					<p>
						<span className="text-white font-medium">3.2</span> We may also share aggregated or de-identified
						information, which cannot reasonably be used to identify you.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl text-white font-semibold">4. Transfer of Information</h2>
					<p>
						<span className="text-white font-medium">4.1</span> All our servers are in the EU and all data is hosted
						there. This is also true for our analytics provider, Fathom, but your data might be exposed to some
						providers such as Cloudflare that are based out of the EU.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl text-white font-semibold">5. Your Choices</h2>
					<p>
						<span className="text-white font-medium">5.1</span> You may update, correct or delete information about you
						at any time emailing us at{' '}
						<a href="mailto:support@llama.fi" className="underline">
							support@llama.fi
						</a>
						, but note that we may retain certain information as required by law or for legitimate business purposes. We
						may also retain cached or archived copies of information about you for a certain period of time.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl text-white font-semibold">6. Contact Us</h2>
					<p>
						<span className="text-white font-medium">6.1</span> If you have any questions about this Privacy Policy,
						please contact us by email at{' '}
						<a href="mailto:support@llama.fi" className="underline">
							support@llama.fi
						</a>
					</p>
				</div>
			</div>
		</SubscribeLayout>
	)
}
