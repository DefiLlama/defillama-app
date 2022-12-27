import About from '../about'

function AboutPage() {
	return <About />
}

export async function getStaticPaths() {
	return { paths: [], fallback: false }
}

export default AboutPage
