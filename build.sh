#!/bin/bash

if [ $# -eq 0 ]; then
    echo "Error: No target specified. Usage: $0 <target>"
    echo "target: gcp, azure, openai"
    echo "example: $0 gcp"
    exit 1
fi

target=$1
target_base="${target}_base"

jq --rawfile code ./src/$target/$target.js '.[0].code = $code' ./src/$target/$target_base.json > ./src/$target/$target.json