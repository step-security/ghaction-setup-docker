# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM golang:alpine@sha256:3ad57304ad93bbec8548a0437ad9e06a455660655d9af011d58b993f6f615648 AS build
ARG TARGETPLATFORM
ARG BUILDPLATFORM
RUN echo "I am running on $BUILDPLATFORM, building for $TARGETPLATFORM" > /log

FROM alpine
COPY --from=build /log /log
