#!/bin/sh
rm -rf ./build
mkdir -p build
go build -ldflags="-s -w" -o ./build/webapp
cp -r templates static cuv.json kjv.json run.sh ./build/
