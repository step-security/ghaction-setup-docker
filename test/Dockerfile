# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM golang:alpine@sha256:ace6cc3fe58d0c7b12303c57afe6d6724851152df55e08057b43990b927ad5e8 AS build
ARG TARGETPLATFORM
ARG BUILDPLATFORM
RUN echo "I am running on $BUILDPLATFORM, building for $TARGETPLATFORM" > /log

FROM alpine
COPY --from=build /log /log
