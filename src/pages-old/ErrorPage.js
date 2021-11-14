import { useEffect } from "react";
import { Image } from 'rebass'

import { LayoutWrapper } from 'layout'
import Llama from 'assets/old_logo_white.png'
import Row from 'components/Row'
import Column from 'components/Column'
import Link from "components/Link"
import { TYPE, ThemedBackground } from 'Theme'

import { setWithExpiry, getWithExpiry } from 'utils/localStorage'


const ErrorFallback = ({ error, theme }) => {
    // Handle failed lazy loading of a JS/CSS chunk.
    useEffect(() => {
        const chunkFailedMessage = /Loading chunk [\d]+ failed/;
        if (error?.message && chunkFailedMessage.test(error.message)) {
            if (!getWithExpiry("chunk_failed")) {
                setWithExpiry("chunk_failed", "true", 10000);
                window.location.reload();
            }
        }
    }, [error]);

    return (
        <LayoutWrapper>
            <ThemedBackground style={{ height: '100vh' }} />
            <Row>
                <Column style={{ margin: 'auto', textAlign: 'center', gap: '0.5rem', height: '100vh', padding: '1rem' }}>
                    <Image src={Llama} alt="sad llama" />
                    <TYPE.main>Something went wrong and we have been notified.</TYPE.main>
                    <TYPE.main>Please try again and if the error persists please reach out on <Link href="https://discord.gg/buPFYXzDDd" target="_blank">Discord</Link></TYPE.main>
                    <TYPE.largeHeader>Error: {error?.message}</TYPE.largeHeader>
                </Column>

            </Row>

        </LayoutWrapper>
    );
}

export default ErrorFallback