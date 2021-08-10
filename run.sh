#!/bin/sh -e

cd "$(dirname "$0")"

while true; do
    go run main.go --tcp :$(cat instance/port)
done
