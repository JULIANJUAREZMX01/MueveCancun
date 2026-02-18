FROM alpine:latest
LABEL Name=muevecancun Version=0.0.1
RUN apk add --no-cache --repository="http://dl-cdn.alpinelinux.org/alpine/edge/community" fortune
ENTRYPOINT ["fortune", "-a"]
