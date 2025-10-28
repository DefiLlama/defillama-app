import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import Layout from '~/layout'

export default function GetStarted() {
	return (
		<>
			<Layout
				title="LlamaAI - DefiLlama"
				description="Ask questions, generate charts, and explore any DeFi metric instantly. LlamaAI brings the power of DefiLlama's comprehensive data to your fingertips through natural conversation."
				keywords="LlamaAI, DefiLlama AI, DeFi AI"
				canonicalUrl="https://defillama.com/ai"
			>
				<div className="flex h-full flex-col gap-15 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="mx-auto mt-12 flex w-full max-w-[585px] flex-col items-center justify-center gap-4">
						<span className="relative flex flex-col items-center justify-center">
							<span
								className="absolute block h-24.5 w-24.5 shrink-0"
								style={{ background: 'linear-gradient(90deg, #FEE2AD 0%, #FEE2AD 100%)', filter: 'blur(32px)' }}
							></span>
							<img src="/icons/llama-ai.svg" alt="LlamaAI" className="z-10 object-contain" width={83} height={99} />
						</span>
						<h1 className="-mt-1 -mb-2 text-center text-[2rem] leading-8 font-extrabold text-black dark:text-white">
							LlamaAI: Your AI Assistant for DeFi Data
						</h1>
						<p className="text-center text-lg leading-6 text-[#666] dark:text-[#919296]">
							Ask questions, generate charts, and explore any DeFi metric instantly. LlamaAI brings the power of
							DefiLlama's comprehensive data to your fingertips through natural conversation.
						</p>
						<BasicLink
							href="/ai"
							className="mx-auto flex items-center justify-between gap-[10px] rounded-md bg-[linear-gradient(93.94deg,#FDE0A9_24.73%,#FBEDCB_57.42%,#FDE0A9_99.73%)] px-4 py-2 text-base font-semibold text-black shadow-[0px_0px_30px_0px_rgba(253,224,169,0.5),_0px_0px_1px_2px_rgba(255,255,255,0.1)]"
						>
							<img src="/icons/ask-llama-ai.svg" alt="Ask LlamaAI" className="h-4 w-4 shrink-0 brightness-0" />
							<span className="whitespace-nowrap">Try LlamaAI</span>
						</BasicLink>
					</div>
					<div className="relative isolate mx-auto mt-[45px] w-full max-w-5xl rounded-md border border-[#e6e6e6] dark:border-[#39393E]">
						<span
							className="absolute top-[-45px] right-0 left-0 mx-auto block h-33 w-full max-w-[85%] shrink-0"
							style={{
								background: 'linear-gradient(90deg, #FBEDCB 0%, #FDE0A9 100%)',
								filter: 'blur(32px)',
								borderRadius: '50%'
							}}
						></span>
						<span className="relative z-10">
							<video src="/assets/llamaai.mp4" className="z-10 h-full w-full rounded-md object-cover" controls />
						</span>
					</div>
					<div className="mx-auto w-full max-w-5xl">
						<h2 className="text-center text-[2rem] leading-8 font-extrabold text-black dark:text-white">FAQ</h2>
						<FAQ question="What is LlamaAI?">
							<p>
								An onchain analyst. You ask in plain language. It compiles the exact query against DefiLlama data and
								returns ranked tables, custom charts, and analysis. Since LlamaAI has access to the entire DefiLlama
								dataset, it excels at performing more detailed analysis than is possible on the main DefiLlama site.
							</p>
						</FAQ>
						<FAQ question="What can it do right now?">
							<ul className="flex list-disc flex-col gap-2 pl-4">
								<li>
									Perform deep analysis, such as identifying categories with the most stable revenue streams or finding
									which protocols have the most consistently revenue growth.
								</li>
								<li>
									Run complex queries to find protocols, chains, and categories that meet specific criteria. For
									example, LlamaAI could identify protocols that are growing in TVL and Revenue, while their token price
									fell.
								</li>
								<li>Generate custom charts filtered by protocol, chain, category, or token.</li>
							</ul>
						</FAQ>
						<FAQ question="Where does the data come from?">
							<p>
								The full DefiLlama dataset: protocols, chains, categories, fees, revenue, TVL, volumes, OI, etc, and
								related derived metrics.
							</p>
						</FAQ>
						<FAQ question="What sort of prompts can it answer?">
							<p>Here are a few example prompts to use with LlamaAI:</p>
							<ul className="flex list-disc flex-col gap-2 pl-4">
								<li>“Which 5 protocols have the most stable revenue streams?”</li>
								<li>“Create a chart of total capital raised vs total value lost to hacks by year.”</li>
								<li>“Which chains have the highest innovation ratio (original protocol TVL / forked protocol TVL)?”</li>
								<li>“Which categories show the highest revenue stability?”</li>
							</ul>
						</FAQ>
						<FAQ question="Who has access?">
							<p>
								LlamaAI is included in DefiLlama Pro along with the DefiLlama Pro dashboard builder, CSV downloads,
								LlamaFeed, and other premium features. Free users can upgrade to use it.
							</p>
						</FAQ>
						<FAQ question="Can I export results?">
							<p>Yes. You can download returned tables and charts as CSVs.</p>
						</FAQ>
						<FAQ question="What metrics are supported?">
							<p>
								Metrics from DefiLlama are supported, including TVL, fees, revenue, holder revenue, P/F, PS, volumes,
								open interest, plus category/chain/protocol/token filters.
							</p>
							<p>LlamaAI also has access to other DefiLlama datasets, such as our Hacks and Raises databases.</p>
						</FAQ>
						<FAQ question="Is this investment advice?">
							<p>
								No. It’s data, rankings, charts, and analysis. Do your own research, which LlamaAI can hopefully be a
								critical tool for.
							</p>
						</FAQ>
						<FAQ question="Need help?">
							<p>
								Contact{' '}
								<a href="mailto:support@defillama.com" className="underline">
									support@defillama.com
								</a>
							</p>
						</FAQ>
					</div>
				</div>
			</Layout>
		</>
	)
}

const FAQ = ({ question, children }: { question: string; children: React.ReactNode }) => {
	return (
		<details className="group border-t border-[#e6e6e6] py-4 first-of-type:border-t-0 dark:border-[#39393E]">
			<summary className="flex items-center justify-between gap-4 text-lg font-extrabold">
				<span>{question}</span>
				<Icon
					name="chevron-down"
					height={24}
					width={24}
					className="text-[#666] transition-transform duration-100 group-open:rotate-180 dark:text-[#919296]"
				/>
			</summary>
			<div className="flex flex-col gap-2 pt-2 text-base leading-6 text-[#666] dark:text-[#919296]">{children}</div>
		</details>
	)
}
