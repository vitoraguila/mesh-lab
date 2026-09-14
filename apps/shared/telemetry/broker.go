// Broker transport for telemetry. Publishing is best effort: when the broker is
// unavailable the request path is never blocked and events are dropped, exactly
// as the earlier direct HTTP transport behaved.
package telemetry

import (
	"context"
	"encoding/json"
	"os"
	"regexp"
	"strings"
	"sync/atomic"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	publishTimeout = 2 * time.Second
	minBackoff     = 500 * time.Millisecond
	maxBackoff     = 5 * time.Second
)

var routingKeySafe = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)
var brokerUp atomic.Bool

// BrokerConnected reports whether the last publish attempt had a live channel.
func BrokerConnected() bool { return brokerUp.Load() }

func routingKey(environment, service, stage string) string {
	parts := make([]string, 0, 3)
	for _, part := range []string{environment, service, stage} {
		clean := routingKeySafe.ReplaceAllString(part, "-")
		if clean == "" {
			clean = "unknown"
		}
		parts = append(parts, clean)
	}
	return strings.Join(parts, ".")
}

// publishLoop owns the connection. It reconnects with backoff and never blocks
// callers: Emit only ever writes to the buffered queue.
func publishLoop(url, exchange string, events <-chan Event) {
	backoff := minBackoff
	for {
		connection, err := amqp.DialConfig(url, amqp.Config{Heartbeat: 10 * time.Second, Locale: "en_US"})
		if err != nil {
			brokerUp.Store(false)
			time.Sleep(backoff)
			backoff = min(backoff*2, maxBackoff)
			continue
		}
		backoff = minBackoff
		if err := session(connection, exchange, events); err != nil {
			brokerUp.Store(false)
		}
		connection.Close()
	}
}

func session(connection *amqp.Connection, exchange string, events <-chan Event) error {
	channel, err := connection.Channel()
	if err != nil {
		return err
	}
	defer channel.Close()
	if err := channel.ExchangeDeclare(exchange, "topic", true, false, false, false, nil); err != nil {
		return err
	}
	closed := connection.NotifyClose(make(chan *amqp.Error, 1))
	brokerUp.Store(true)
	for {
		select {
		case reason := <-closed:
			if reason != nil {
				return reason
			}
			return amqp.ErrClosed
		case event := <-events:
			event.Transport = "amqp"
			event.Exchange = exchange
			event.RoutingKey = routingKey(event.Environment, event.Service, event.Stage)
			event.PublishedAt = time.Now().UTC().Format(time.RFC3339Nano)
			body, err := json.Marshal(event)
			if err != nil {
				continue
			}
			ctx, cancel := context.WithTimeout(context.Background(), publishTimeout)
			err = channel.PublishWithContext(ctx, exchange, event.RoutingKey, false, false, amqp.Publishing{
				ContentType:  "application/json",
				DeliveryMode: amqp.Persistent,
				MessageId:    event.EventID,
				Timestamp:    time.Now().UTC(),
				Body:         body,
			})
			cancel()
			if err != nil {
				return err
			}
		}
	}
}

func brokerEnabled() (string, string, bool) {
	url, exchange := os.Getenv("AMQP_URL"), os.Getenv("AMQP_EXCHANGE")
	if url == "" || exchange == "" {
		return "", "", false
	}
	return url, exchange, true
}
