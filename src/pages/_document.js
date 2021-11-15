import Document from 'next/document'
import { ServerStyleSheet } from 'styled-components'

export default class MyDocument extends Document {
    static async getInitialProps(ctx) {
        const sheet = new ServerStyleSheet()
        const originalRenderPage = ctx.renderPage

        try {
            ctx.renderPage = () =>
                originalRenderPage({
                    enhanceApp: (App) => (props) =>
                        sheet.collectStyles(<App {...props} />),
                })

            const initialProps = await Document.getInitialProps(ctx)
            return {
                ...initialProps,
                styles: (
                    <>
                        {initialProps.styles}
                        {sheet.getStyleElement()}
                        <style
                            id="stitches"
                            dangerouslySetInnerHTML={{
                                __html: `@font-face {
                                font-family: 'Inter var';
                                font-style: normal;
                                font-weight: 100 900;
                                font-display: swap;
                                src: url('/font-files/Inter-roman.var.woff2') format('woff2');
                                font-named-instance: 'Regular';
                              }` }}
                        />
                    </>
                ),
            }
        } finally {
            sheet.seal()
        }
    }
}