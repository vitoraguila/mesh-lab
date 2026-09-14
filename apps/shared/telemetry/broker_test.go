package telemetry

import (
	"os"
	"testing"
)

func TestRoutingKeyIsSafeAndScoped(t *testing.T) {
	if key := routingKey("stg", "catalog", "completed"); key != "stg.catalog.completed" {
		t.Fatal(key)
	}
	// Untrusted-looking segments must not be able to widen a binding.
	if key := routingKey("stg", "cat#alog", "*"); key != "stg.cat-alog.-" {
		t.Fatal(key)
	}
	if key := routingKey("", "", ""); key != "unknown.unknown.unknown" {
		t.Fatal(key)
	}
}

func TestBrokerEnabledNeedsBothSettings(t *testing.T) {
	t.Setenv("AMQP_URL", "")
	t.Setenv("AMQP_EXCHANGE", "")
	if _, _, ok := brokerEnabled(); ok {
		t.Fatal("broker reported without configuration")
	}
	t.Setenv("AMQP_URL", "amqp://user:pass@rabbitmq:5672/")
	if _, _, ok := brokerEnabled(); ok {
		t.Fatal("broker reported without an exchange")
	}
	t.Setenv("AMQP_EXCHANGE", "mesh.events")
	url, exchange, ok := brokerEnabled()
	if !ok || url == "" || exchange != "mesh.events" {
		t.Fatal("broker configuration not read")
	}
	if os.Getenv("AMQP_URL") == "" {
		t.Fatal("environment not applied")
	}
}
