import Layout from '~/layout'
import styled from 'styled-components'

export default function Protocols() {
	return (
		<Layout title={`Reports - DefiLlama`} defaultSEO>
			<Header style={{ textAlign: 'center' }}>Reports</Header>
			<List>
				<li>
					29 December 2022:{' '}
					<a
						href="https://drive.google.com/file/d/1zfJgQEOA4QVKMUyVifBhybhxgkbFRWpG/view"
						target="_blank"
						rel="noopener noreferrer"
					>
						2022 EOY Report
					</a>
				</li>
			</List>
		</Layout>
	)
}

const Header = styled.h1`
	color: ${({ theme }) => theme.text1};
	font-weight: 600;
	font-size: revert !important;
	text-align: center;

	a {
		position: relative;
		top: 4px;
	}
`

const List = styled.ul`
	list-style: none;
  margin: 24px auto;
  padding: 0;

	li {
		font-size: 1rem;
		font-weight: 500;
    text-center;
	}

  a {
    text-decoration: underline;
  }
`
