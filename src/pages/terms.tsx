import { SubscribeLayout2 } from './subscription/fulfillment-policies'

export default function TermsOfUse() {
	return (
		<SubscribeLayout2>
			<div className="mx-auto mb-[64px] flex w-full max-w-3xl flex-col gap-8 text-[#d5d5d5]">
				<h1 className="text-center text-3xl font-bold text-white">TERMS OF USE</h1>
				<p className="text-center">Effective Date: 24 June 2025</p>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">1. ACCEPTANCE OF THESE TERMS</h2>
					<p>
						By accessing or using{' '}
						<a href="https://defillama.com/" className="underline">
							https://defillama.com/
						</a>{' '}
						(the <strong>"Site"</strong>), together with its data, analytics, customisation options, plugins, chatbot,
						notifications, swap facilitator, official public API(s) and any other product or service that requires an
						account or API key (collectively, the <strong>"Services"</strong>), you—whether individually or on behalf of
						an organisation (<strong>"User"</strong>, "you", <strong>"your"</strong>)—agree to be irrevocably bound by
						these Terms of Use and any documents expressly incorporated herein. You must review the then-current Terms
						each time you access the Site or Services.
					</p>
					<p>
						The Site and Services are intended only for persons aged 18 or older. If you are under 18, you must not use
						the Site or Services. If you do not accept these Terms, do not use the Site or Services.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">2. CHANGES TO THE SITE, SERVICES OR TERMS</h2>
					<p>
						<strong>DefiLlama Limited</strong>, a company incorporated in the United Arab Emirates ("Company", "we",{' '}
						<strong>"us"</strong>), may update the Site, Services or these Terms at any time. Revised Terms take effect
						upon posting (see Effective Date above); continued use after posting constitutes acceptance, and you waive
						any right to individual notice.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">3. TERRITORIAL REACH & ELIGIBILITY</h2>
					<p>
						The Site is controlled from the UAE. We do not represent that the content is lawful elsewhere; Users who
						access the Site from other jurisdictions do so at their own risk and remain responsible for local
						compliance.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">4. SUBSCRIPTION SERVICES</h2>

					<h3 className="text-lg font-medium text-white">4.1 Definitions</h3>
					<ol className="flex list-decimal flex-col pl-4" style={{ listStyleType: 'lower-alpha' }}>
						<li>"Subscription Services" means the paid features described on the order page, as updated by us.</li>
						<li>"Subscriber" means the legal or natural person that purchases a Subscription.</li>
						<li>
							"Subscription Term" means the period beginning on the Effective Date (first successful payment) and
							continuing until cancelled in accordance with Clause 4.7.
						</li>
						<li>"Fees" means the amounts payable under Clause 4.3.</li>
					</ol>

					<h3 className="text-lg font-medium text-white">4.2 Provision of Services</h3>
					<ol className="flex list-decimal flex-col pl-4" style={{ listStyleType: 'lower-alpha' }}>
						<li>
							We will make the Subscription Services available to the Subscriber during the Subscription Term, subject
							to these Terms and these Subscription terms.
						</li>
						<li>
							The Subscription Services are provided <strong>"as is"</strong> and <strong>"as available."</strong> The
							Subscriber acknowledges that
							<ol className="mt-2 flex list-decimal flex-col pl-4" style={{ listStyleType: 'lower-roman' }}>
								<li>functionality may change, improve or be deprecated without notice; and</li>
								<li>the Subscription is not tied to any particular version or feature set.</li>
							</ol>
						</li>
					</ol>
					<p>Continued use after changes constitutes acceptance of the amended terms.</p>

					<h3 className="text-lg font-medium text-white">4.3 Fees, Taxes & Payment</h3>
					<ol className="flex list-decimal flex-col pl-4" style={{ listStyleType: 'lower-alpha' }}>
						<li>
							Billing cycle: Fees are billed monthly or yearly in advance (as chosen on the order page) and collected
							automatically via the payment method on file.
						</li>
						<li>Taxes: Fees are exclusive of VAT or other taxes, which the Subscriber must pay in addition.</li>
						<li>No set-off: The Subscriber may not withhold or set-off Fees against any claim against the Company.</li>
						<li>
							By providing payment details you authorise us (and our payment processor) to charge all Fees when due.
							Access is conditional on full, advance payment.
						</li>
					</ol>

					<h3 className="text-lg font-medium text-white">4.4 Data Use & Privacy</h3>
					<p>
						We may process usage data generated by the Subscriber solely to (i) operate and secure the Subscription
						Services and (ii) perform internal analytics and product development. Where required, such data will be
						aggregated and/or anonymised. We comply with UAE Federal Decree-Law 45/2021 (PDPL) and any other mandatory
						data-protection rules.
					</p>

					<h3 className="text-lg font-medium text-white">4.5 Availability & Maintenance</h3>
					<ol className="flex list-decimal flex-col pl-4" style={{ listStyleType: 'lower-alpha' }}>
						<li>
							We do not guarantee uninterrupted availability. Planned or emergency maintenance may reduce or suspend
							access.
						</li>
						<li>We will use commercially reasonable efforts to schedule planned maintenance outside peak hours.</li>
						<li>New versions may be deployed without prior notice.</li>
					</ol>

					<h3 className="text-lg font-medium text-white">4.6 Errors & Exclusive Remedy</h3>
					<ol className="flex list-decimal flex-col pl-4" style={{ listStyleType: 'lower-alpha' }}>
						<li>
							An "Error" exists if (i) the Subscriber cannot access the Subscription Services or a material function and
							(ii) the cause is within our reasonable control.
						</li>
						<li>
							Upon written notice of an Error, the Subscriber will provide sufficient detail to reproduce it. We will
							use commercially reasonable efforts to correct the Error within a reasonable time.
						</li>
						<li>
							Sole remedy – Clause 4.6(b) is the Subscriber's exclusive remedy; the Subscriber waives all other rights
							or remedies (including damages) arising from Errors or content inaccuracies.
						</li>
					</ol>

					<h3 className="text-lg font-medium text-white">4.7 Termination & Suspension</h3>
					<ol className="flex list-decimal flex-col pl-4" style={{ listStyleType: 'lower-alpha' }}>
						<li>
							For convenience – Either party may terminate the Subscription at any time by notice via the account portal
							or e-mail. Termination takes effect at the end of the current billing period unless we terminate
							immediately for your breach. If we terminate for convenience while you are not in breach, we will refund
							the unused portion of any pre-paid Fees on a pro-rata basis.
						</li>
						<li>
							Suspension – We may suspend access immediately if (i) Fees are overdue, (ii) we suspect unauthorised or
							unlawful use, or (iii) continued use would breach applicable law.
						</li>
						<li>
							Effect of termination – On termination (i) all licences granted to the Subscriber cease; (ii) Fees already
							paid are non-refundable (except as stated above); and (iii) provisions that by nature survive
							(confidentiality, data-use rights, liability limits, governing law) remain in force.
						</li>
					</ol>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">5. LIMITED PERSONAL-DATA COLLECTION</h2>
					<ol className="flex list-decimal flex-col pl-4" style={{ listStyleType: 'lower-alpha' }}>
						<li>
							Apart from the situations set out below, the Site displays only aggregated, non-identifiable information
							and does not process personal data within the meaning of the PDPL.
						</li>
						<li>
							Server logs & security – Our hosting provider creates transient security logs (e.g., IP address, browser
							type) for network protection. These logs are anonymised or erased in line with PDPL legitimate-interest
							grounds.
						</li>
						<li>
							Account creation / payment – When you create an account (free or paid) or subscribe, we collect your
							e-mail address and, for paid plans, your wallet address or card details. We process these data solely to
							provide the Services and manage your account.
						</li>
						<li>
							Voluntary contact – If you contact us, we handle any personal data per the PDPL and delete it when no
							longer required.
						</li>
					</ol>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">6. INFORMATIONAL PURPOSE & NO ADVICE</h2>
					<p>
						All material on the Site (the <strong>"Content & Data"</strong>) is for general information only and does
						not constitute legal, financial, investment, tax or other professional advice. DefiLlama Limited or its
						affiliates may hold positions in protocols or tokens referenced herein; this disclosure is{' '}
						<strong>not</strong> a recommendation. Use the information at your own risk. We accept no liability for
						losses arising from reliance on the Content & Data. Subscribers and Users should obtain appropriate
						professional advice before acting on the Content & Data.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">7. INTELLECTUAL-PROPERTY RIGHTS</h2>
					<p>
						Except where expressly attributed to third parties, all{' '}
						<strong>Content, data sets, layout, design, logos and underlying code</strong> are owned by or licensed to
						us and are protected by UAE copyright, trademark and database-rights laws. Subject to Clause 8, we grant you
						a revocable, non-transferable, non-exclusive licence to access and use the Site for personal, non-commercial
						purposes.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">8. PERMITTED & PROHIBITED USE</h2>
					<p>
						You may view the Site and its data under a limited licence; you agree <strong>not</strong> to:
					</p>
					<ol className="flex list-decimal flex-col pl-4">
						<li>modify or copy the materials;</li>
						<li>decompile or reverse-engineer any Content, Services or Subscription Services;</li>
						<li>remove any copyright or proprietary notices;</li>
						<li>transfer or "mirror" the materials on another server;</li>
						<li>use the information for competitive purposes;</li>
						<li>resell the data or resell access to the data through your plan without permission;</li>
						<li>republish the data in any form without permission;</li>
						<li>register duplicate accounts;</li>
						<li>programmatically access any API other than our official public API;</li>
						<li>
							copy, scrape, harvest or otherwise exploit the Content & Data for commercial purposes without prior
							written consent;
						</li>
						<li>interfere with or disrupt the Site, servers or networks;</li>
						<li>use robots, spiders or other automated means to access the Site for any purpose.</li>
					</ol>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">9. THIRD-PARTY LINKS</h2>
					<p>
						Links to third-party sites or feeds are provided for convenience only; we do not endorse and are not
						responsible for their content or privacy practices.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">10. DISCLAIMER OF WARRANTIES</h2>
					<p>
						The Site, Services and Content & Data are provided "as is" and "as available," without warranties of any
						kind, express or implied. We do not guarantee uninterrupted or error-free operation.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">11. LIMITATION OF LIABILITY</h2>
					<p>
						To the fullest extent permitted by law, the Company and its directors, employees, agents and licensors are
						not liable for indirect, incidental, special, consequential or punitive damages, or for loss of profits,
						data, goodwill or business opportunities, arising out of your use—or inability to use—the Site.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">12. INDEMNITY</h2>
					<p>
						You will indemnify and hold harmless the Company and its affiliates against any claims, damages, losses and
						expenses (including reasonable attorneys' fees) arising from your breach of these Terms or misuse of the
						Site. The Company is not responsible for any fraudulent, illegal or unauthorised use of the Site, APIs or
						data by Users or third parties.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">13. SUSPENSION & TERMINATION (SITE ACCESS)</h2>
					<p>
						We may suspend, restrict or terminate your access to the <strong>Site, data and APIs</strong> at any time,
						without notice, if we reasonably believe you have breached these Terms or applicable law.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">14. ENFORCEMENT OF DATA-USE RESTRICTIONS</h2>
					<p>Any breach of Clause 8 or unauthorised use of the data/API entitles the Company to:</p>
					<ol className="flex list-decimal flex-col pl-4" style={{ listStyleType: 'lower-roman' }}>
						<li>immediate termination of all access;</li>
						<li>injunctive relief without the need to post bond;</li>
						<li>recovery of all profits derived from the unauthorised use; and</li>
						<li>
							liquidated damages up to USD 100,000 per violation, or the amount of actual damages proven, whichever is
							greater.
						</li>
					</ol>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">15. GOVERNING LAW & DISPUTE RESOLUTION</h2>
					<p>
						These Terms, their subject matter, and formation are governed by the federal laws of the United Arab
						Emirates and, to the extent applicable, the laws of the Emirate/Freezone of the Site incorporation.
					</p>
					<p>
						All parties agree to refer any disputes between the parties arising out of or in connection with this Terms
						including any questions regarding its existence, validity, or termination to the Dubai International
						Arbitration Centre. The rules of arbitration will as such:
					</p>
					<ol className="flex list-decimal flex-col pl-4" style={{ listStyleType: 'lower-alpha' }}>
						<li>
							A sole arbitrator shall be appointed by agreement of the parties. If the parties have not agreed on the
							appointment of a sole arbitrator within 30 days from the receipt of a notice of arbitration, then, the
							sole arbitrator shall be appointed by the Company. Should the Company decide, in its sole discretion, that
							the scope of the matter requires more than one arbitrator, then it may elect to appoint up to three
							arbitrators.
						</li>
						<li>
							The Seat and Place of Arbitration shall be Dubai, United Arab Emirates with its proceedings governed by
							the rules of the Dubai International Arbitration Centre.
						</li>
						<li>
							The appointed arbitrator(s) shall hold the proceedings in Dubai International Arbitration Centre and the
							rules of Dubai International Arbitration Centre shall apply.
						</li>
						<li>The language of the arbitration proceedings shall be English.</li>
						<li>
							The Costs of the Arbitration shall be borne by the claimant initially and the final costs shall be decided
							by any decision/award provided by the Arbitrator.
						</li>
						<li>The decision of the Arbitrator shall be final and binding.</li>
						<li>The Parties may agree to change the rules herein through a written agreement.</li>
					</ol>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">16. SEVERABILITY</h2>
					<p>
						In the event that any of the provisions of this Agreement are held to be invalid or unenforceable in whole
						or in part, the remaining provisions shall not be affected and shall continue to be valid and enforceable as
						though the invalid or unenforceable parts had not been included in this Agreement.
					</p>
					<p>
						The illegality, invalidity, and non-enforceable provision(s) of this document under the laws of any
						jurisdiction shall not affect its illegality, validity or enforceability under the law of any other
						jurisdiction or provision.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">17. ENTIRE AGREEMENT</h2>
					<p>
						These Terms constitute the entire agreement between you and us regarding your use of the Site and supersede
						all prior or contemporaneous understandings. DeFillama Limited may revise these Terms of Use for the Site at
						any time without notice. By using the website or data you are agreeing to be bound by the Terms then in
						effect.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<h2 className="text-xl font-semibold text-white">18. CONTACT</h2>
					<p>Questions or requests regarding these Terms:</p>
					<p>
						<em>E-mail:</em>{' '}
						<a href="mailto:support@defillama.com" className="underline">
							support@defillama.com
						</a>
					</p>
				</div>
			</div>
		</SubscribeLayout2>
	)
}
