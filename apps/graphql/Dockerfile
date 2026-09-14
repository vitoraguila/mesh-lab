FROM golang:1.25.5-alpine AS build
WORKDIR /src
COPY apps/shared ./shared
COPY apps/graphql ./graphql
WORKDIR /src/graphql
ARG SOURCE_REVISION=unknown
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X study.local/shared/telemetry.SourceRevision=${SOURCE_REVISION}" -o /server .
FROM scratch
COPY --from=build /server /server
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/server"]
