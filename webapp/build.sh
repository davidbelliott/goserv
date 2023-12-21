#!/bin/sh
rm -rf ./build
mkdir -p build
if [ ! -e go.mod ]; then
  go mod init webapp
fi
go mod tidy
go build -ldflags="-s -w" -o ./build/webapp
cp -r templates static cuv.json kjv.json ./build/
