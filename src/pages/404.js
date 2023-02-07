import Layout from '~/layout'
import styled from 'styled-components'

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
			<Style>404 - Page not found</Style>
		</Layout>
	)
}
