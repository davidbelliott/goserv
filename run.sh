#!/bin/sh -e

cd "$(dirname "$0")"
go run main.go --tcp :$(cat instance/port)
