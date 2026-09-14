// Queue consumer. The hub keeps its in-memory fan-out; the broker replaces the
// direct HTTP hop between producers and this service.
package main

import (
	"encoding/json"
	"os"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"study.local/shared/telemetry"
)

type brokerState struct {
	Enabled   bool   `json:"enabled"`
	Connected bool   `json:"connected"`
	Exchange  string `json:"exchange"`
	Queue     string `json:"queue"`
	Depth     int    `json:"depth"`
	Consumers int    `json:"consumers"`
	Delivered uint64 `json:"delivered"`
	Ingested  uint64 `json:"ingested"`
	Since     string `json:"since"`
}

const (
	prefetch    = 50
	depthPeriod = 2 * time.Second
	dialBackoff = 2 * time.Second
)

// consume owns the connection and reconnects forever. Delivery acknowledgement
// happens after fan-out, so a restart replays anything not yet handed over.
func (h *hub) consume(url, exchange, queue string) {
	h.mu.Lock()
	h.broker.Enabled = true
	h.broker.Exchange = exchange
	h.broker.Queue = queue
	h.mu.Unlock()
	for {
		if err := h.session(url, exchange, queue); err != nil {
			h.mu.Lock()
			h.broker.Connected = false
			h.broker.Depth = 0
			h.broker.Consumers = 0
			h.mu.Unlock()
		}
		time.Sleep(dialBackoff)
	}
}

func (h *hub) session(url, exchange, queue string) error {
	connection, err := amqp.DialConfig(url, amqp.Config{Heartbeat: 10 * time.Second, Locale: "en_US"})
	if err != nil {
		return err
	}
	defer connection.Close()
	channel, err := connection.Channel()
	if err != nil {
		return err
	}
	defer channel.Close()
	if err := channel.ExchangeDeclare(exchange, "topic", true, false, false, false, nil); err != nil {
		return err
	}
	declared, err := channel.QueueDeclare(queue, true, false, false, false, nil)
	if err != nil {
		return err
	}
	if err := channel.QueueBind(declared.Name, "#", exchange, false, nil); err != nil {
		return err
	}
	if err := channel.Qos(prefetch, 0, false); err != nil {
		return err
	}
	deliveries, err := channel.Consume(declared.Name, "events-"+os.Getenv("APP_ENV"), false, false, false, false, nil)
	if err != nil {
		return err
	}
	h.mu.Lock()
	h.broker.Connected = true
	h.broker.Since = time.Now().UTC().Format(time.RFC3339)
	h.mu.Unlock()
	stop := make(chan struct{})
	defer close(stop)
	go h.watchDepth(connection, queue, stop)
	for delivery := range deliveries {
		var event telemetry.Event
		if json.Unmarshal(delivery.Body, &event) == nil && event.ID != "" && len(event.ID) <= 128 && event.Environment == os.Getenv("APP_ENV") {
			event.Transport = "amqp"
			event.Exchange = exchange
			event.Queue = declared.Name
			if event.RoutingKey == "" {
				event.RoutingKey = delivery.RoutingKey
			}
			event.DeliveredAt = time.Now().UTC().Format(time.RFC3339Nano)
			h.publish(event)
			h.mu.Lock()
			h.broker.Delivered++
			h.mu.Unlock()
		}
		delivery.Ack(false)
	}
	return amqp.ErrClosed
}

// watchDepth reads the real ready-message count on its own channel so the
// interface can show queue depth without a management plugin.
func (h *hub) watchDepth(connection *amqp.Connection, queue string, stop <-chan struct{}) {
	channel, err := connection.Channel()
	if err != nil {
		return
	}
	defer channel.Close()
	ticker := time.NewTicker(depthPeriod)
	defer ticker.Stop()
	for {
		select {
		case <-stop:
			return
		case <-ticker.C:
			state, err := channel.QueueDeclarePassive(queue, true, false, false, false, nil)
			if err != nil {
				return
			}
			h.mu.Lock()
			h.broker.Depth = state.Messages
			h.broker.Consumers = state.Consumers
			h.mu.Unlock()
		}
	}
}
