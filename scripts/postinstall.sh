#!/bin/sh
patch ./node_modules/next/dist/server/send-payload/revalidate-headers.js <scripts/revalidate-headers.patch
