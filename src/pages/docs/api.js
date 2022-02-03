import SwaggerUI from "swagger-ui-react"
import "swagger-ui-react/swagger-ui.css"
import yamlApiSpec from "../../docs/resolvedSpec.json"
import { GeneralLayout } from '../../layout'
import DarkSwagger from "../../docs/swaggerDark"
import { useDarkModeManager } from "../../contexts/LocalStorage"
import styled from 'styled-components'

export default function ApiDocs() {
    return (
        <GeneralLayout title={`API Docs - DefiLlama`}>
            <DarkModeWrapper />
        </GeneralLayout>
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