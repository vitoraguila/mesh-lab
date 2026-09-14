module study.local/authz

go 1.25.0

require study.local/shared v0.0.0

require github.com/rabbitmq/amqp091-go v1.10.0 // indirect

replace study.local/shared => ../shared
