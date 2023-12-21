#!/bin/sh
docker save -o remote/goserv-webapp.tar.gz goserv-webapp
docker save -o remote/goserv-webserver.tar.gz goserv-webserver
scp remote/* deadfacade:
ssh deadfacade "./load.sh"
