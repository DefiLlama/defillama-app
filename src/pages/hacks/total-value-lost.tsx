import { maxAgeForNext } from '~/api'
import { getTotalValueLostInHacksByProtocol } from '~/containers/Hacks/queries'
import { TotalValueLostContainer } from '~/containers/Hacks/TotalValueLost'
import type { IProtocolTotalValueLostInHacksByProtocol } from '~/containers/Hacks/types'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('protocols/total-value-lost-in-hacks', async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const data = await getTotalValueLostInHacksByProtocol({
		protocolMetadata: metadataCache.protocolMetadata
	})
	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export default function TotalLostInHacks(props: IProtocolTotalValueLostInHacksByProtocol) {
	return <TotalValueLostContainer {...props} />
}
