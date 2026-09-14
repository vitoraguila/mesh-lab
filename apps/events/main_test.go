package main

import (
	"net/http/httptest"
	"strings"
	"study.local/shared/telemetry"
	"testing"
)

func TestBoundedHistoryAndSlowSubscriber(t *testing.T) {
	t.Setenv("APP_ENV", "stg")
	slow := make(chan telemetry.Event, 1)
	h := &hub{clients: map[chan telemetry.Event]bool{slow: true}}
	for i := 0; i < 300; i++ {
		w := httptest.NewRecorder()
		h.ingest(w, httptest.NewRequest("POST", "/ingest", strings.NewReader(`{"requestId":"sample","environment":"stg","service":"catalog","stage":"received"}`)))
		if w.Code != 202 {
			t.Fatal(w.Code)
		}
	}
	if len(h.history) != 200 || len(slow) != 1 {
		t.Fatal("unbounded buffering")
	}
	w := httptest.NewRecorder()
	h.ingest(w, httptest.NewRequest("POST", "/ingest", strings.NewReader(`{"requestId":"sample","environment":"prd"}`)))
	if w.Code != 400 {
		t.Fatal("cross-environment event accepted")
	}
	if h.history[len(h.history)-1].Transport != "http" {
		t.Fatal("direct ingestion not labelled")
	}
	if state := h.state(); state.Enabled || state.Connected || state.Ingested != 300 {
		t.Fatal("broker state reported without a broker")
	}
}

func TestBrokerDeliveryIsLabelledAndCounted(t *testing.T) {
	t.Setenv("APP_ENV", "stg")
	h := &hub{clients: map[chan telemetry.Event]bool{}}
	h.broker = brokerState{Enabled: true, Connected: true, Exchange: "mesh.events", Queue: "mesh.events.stg", Depth: 3}
	h.publish(telemetry.Event{ID: "sample", Environment: "stg", Service: "catalog", Stage: "completed", Transport: "amqp", Queue: "mesh.events.stg"})
	if len(h.history) != 1 || h.history[0].Transport != "amqp" {
		t.Fatal("queued delivery not recorded")
	}
	if state := h.state(); !state.Connected || state.Depth != 3 || state.Queue != "mesh.events.stg" {
		t.Fatal("broker state not exposed")
	}
}
