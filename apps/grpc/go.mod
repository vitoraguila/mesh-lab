module study.local/grpc

go 1.25.0

require (
	google.golang.org/grpc v1.75.1
	google.golang.org/protobuf v1.36.8
	study.local/shared v0.0.0-00010101000000-000000000000
)

require (
	github.com/rabbitmq/amqp091-go v1.10.0 // indirect
	golang.org/x/net v0.41.0 // indirect
	golang.org/x/sys v0.33.0 // indirect
	golang.org/x/text v0.26.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20250707201910-8d1bb00bc6a7 // indirect
)

replace study.local/shared => ../shared
