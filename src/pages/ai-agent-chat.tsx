import { AgenticChat } from '~/containers/LlamaAIAgentic'
import Layout from '~/layout'

export default function AgenticChatPage() {
	return (
		<Layout
			title="LlamaAI Agent - DefiLlama"
			description="AI-powered DeFi data agent with SQL, charts, and natural language queries"
		>
			<AgenticChat />
		</Layout>
	)
}
