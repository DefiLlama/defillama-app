import Layout from '~/layout'
import styled from 'styled-components'
import Image from 'next/image'
import lostLlama from '~/assets/404.png'

const Style = styled.div`
	color: #8e8f91;
	font-size: 3em;
	line-height: 1.55;
	margin: auto;
	text-align: center;
	/*max-width: 600px;*/
	width: 100%;
`

export default function HomePage(props) {
	return (
		<Layout title="DefiLlama - Page not found">
			<Style>
				<Image src={lostLlama} width="350" height="350" alt="Want a ride?" style={{ margin: 'auto' }} />
				404 - Page not found
			</Style>
		</Layout>
	)
}
