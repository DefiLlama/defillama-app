import "swagger-ui-react/swagger-ui.css"
import yamlApiSpec from "../../docs/resolvedSpec.json"
import Layout from '../../layout'
import DarkSwagger from "../../docs/swaggerDark"
import { useDarkModeManager } from "../../contexts/LocalStorage"
import styled from 'styled-components'

import dynamic from "next/dynamic";

const SwaggerUI = dynamic(import('swagger-ui-react'), { ssr: false })

export default function ApiDocs() {
    return (
        <Layout title={`API Docs - DefiLlama`}>
            <DarkModeWrapper />
        </Layout>
    )
}

const HideSections = styled.div`
.scheme-container {
    display: none
}
`

function DarkModeWrapper() {
    const [isDark] = useDarkModeManager()
    const Wrapper = isDark ? DarkSwagger : styled.div``
    return (
        <HideSections>
            <Wrapper>
                <SwaggerUI spec={yamlApiSpec} defaultModelsExpandDepth={-1} />
            </Wrapper>
        </HideSections>
    )
}