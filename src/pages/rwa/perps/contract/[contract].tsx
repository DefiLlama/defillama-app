import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { RWAPerpsContractPage } from '~/containers/RWA/Perps/Contract'
import { getRWAPerpsContractData } from '~/containers/RWA/Perps/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

function safeDecodeContractParam(value: string): string {
	try {
		return decodeURIComponent(value)
	} catch {
		return value
	}
}

function resolveCanonicalContract(contractParam: string, contracts: string[]): string | null {
	const normalizedContractParam = contractParam.toLowerCase()

	for (const contract of contracts) {
		if (contract.toLowerCase() === normalizedContractParam) {
			return contract
		}
	}

	return null
}

export async function getStaticPaths() {
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	return {
		paths: metadataCache.rwaPerpsList.contracts.slice(0, 10).map((contract) => ({ params: { contract } })),
		fallback: 'blocking'
	}
}

export const getStaticProps = withPerformanceLogging(
	'rwa/perps/contract/[contract]',
	async ({ params }: GetStaticPropsContext<{ contract: string }>) => {
		if (!params?.contract) {
			return { notFound: true }
		}

		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const contractParam = safeDecodeContractParam(params.contract)
		const canonicalContract = resolveCanonicalContract(contractParam, metadataCache.rwaPerpsList.contracts)
		if (!canonicalContract) {
			return { notFound: true }
		}

		const contract = await getRWAPerpsContractData({ contract: canonicalContract })
		if (!contract) {
			return { notFound: true }
		}

		return {
			props: { contract },
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['RWA Perps']

export default function RWAPerpsContractDetailPage({ contract }: InferGetStaticPropsType<typeof getStaticProps>) {
	const canonicalContract = encodeURIComponent(contract.contract.contract)

	return (
		<Layout
			title={`${contract.contract.contract} - RWA Perps Analytics - DefiLlama`}
			description={`Track the ${contract.contract.contract} perpetual market on ${contract.contract.venue}, including price, open interest, funding, market history, and detailed market data.`}
			pageName={pageName}
			canonicalUrl={`/rwa/perps/contract/${canonicalContract}`}
		>
			<RWAPerpsContractPage contract={contract} />
		</Layout>
	)
}
