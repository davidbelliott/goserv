FROM golang:alpine AS build
RUN apk --no-cache add gcc g++ make git
WORKDIR /go/src/app
COPY . .
RUN ./build.sh

FROM alpine:3.17
RUN apk --no-cache add ca-certificates
COPY --from=build /go/src/app/build/ .
EXPOSE 8080
ENTRYPOINT ./webapp --tcp :8080
