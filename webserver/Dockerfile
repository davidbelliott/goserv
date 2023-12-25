# Build static files
FROM node:latest AS rave-web-builder
WORKDIR /app
COPY ./rave-web .
RUN npm i
RUN ./build.sh

# Second stage: nginx
FROM nginx:alpine
RUN apk add --update certbot

# Add a script to obtain and renew certificates
COPY ./webserver/obtain_certificates.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/obtain_certificates.sh

COPY ./webserver/deadfacade.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=rave-web-builder /app/dist /usr/share/nginx/html/rave

CMD /usr/local/bin/obtain_certificates.sh && nginx -g "daemon off;"
