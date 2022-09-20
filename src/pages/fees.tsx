import FeesContainer, { feesStaticProps } from "~/containers/FeesContainer"

export async function getStaticProps() {
  return feesStaticProps("All")
}

export default function Fees(props) {
  return FeesContainer(props)
}