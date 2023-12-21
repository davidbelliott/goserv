#!/bin/sh
docker-compose down
docker load -i goserv-webapp.tar.gz
docker load -i goserv-webserver.tar.gz
docker-compose up -d
