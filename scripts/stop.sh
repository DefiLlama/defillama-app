#!/bin/bash

# source .env if it exists
set -a
[ -f .env ] && . .env

pm2 delete ecosystem.config.js
