module study.local/graphql

go 1.25.0

require study.local/shared v0.0.0

require github.com/graphql-go/graphql v0.8.1

require github.com/rabbitmq/amqp091-go v1.10.0 // indirect

replace study.local/shared => ../shared
