module study.local/events

go 1.25.0

require study.local/shared v0.0.0

require (
	github.com/gorilla/websocket v1.5.3
	github.com/rabbitmq/amqp091-go v1.10.0
)

replace study.local/shared => ../shared
