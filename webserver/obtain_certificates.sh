#!/bin/sh

nginx &

DOMAIN=deadfacade.net
EMAIL=d@deadfacade.net

sleep 5

# Obtain or renew certificates
certbot certonly --dry-run --non-interactive --agree-tos --email $EMAIL --standalone -d $DOMAIN

nginx -s stop

# Set up automatic renewal
echo "0 0 * * * certbot renew --quiet --renew-hook 'nginx -s reload'" | crontab -

# Wait for nginx to stop
sleep 5
