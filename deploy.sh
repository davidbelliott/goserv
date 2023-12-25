#!/bin/sh
docker-compose build
docker save -o remote-files/goserv-webapp.tar.gz goserv-webapp
docker save -o remote-files/goserv-webserver.tar.gz goserv-webserver
scp remote-files/* deadfacade:
ssh deadfacade "./load.sh"
