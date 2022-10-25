import FeesContainer, { feesStaticProps, feesChainsSet } from '~/containers/FeesContainer'

export async function getStaticProps({ params }) {
	const chain = params.chain
	return feesStaticProps(chain)
}

// export async function getStaticPaths() {
// 	const paths = feesChainsSet.map((chain) => ({
// 		params: { chain }
// 	}))

// 	return { paths, fallback: 'blocking' }
// }

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Fees(props) {
	return FeesContainer(props)
}
