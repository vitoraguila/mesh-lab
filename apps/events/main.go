package main

import (
	"encoding/json"
	"github.com/gorilla/websocket"
	"net/http"
	"os"
	"study.local/shared/httpapi"
	"study.local/shared/telemetry"
	"sync"
	"time"
)

type hub struct {
	mu      sync.Mutex
	history []telemetry.Event
	clients map[chan telemetry.Event]bool
	broker  brokerState
}

// publish records an event in the replay ring and fans it out. Slow subscribers
// lose events rather than blocking the producer.
func (h *hub) publish(event telemetry.Event) {
	h.mu.Lock()
	h.history = append(h.history, event)
	if len(h.history) > 200 {
		h.history = h.history[len(h.history)-200:]
	}
	for ch := range h.clients {
		select {
		case ch <- event:
		default:
		}
	}
	h.mu.Unlock()
}

func (h *hub) state() brokerState {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.broker
}

func (h *hub) ingest(w http.ResponseWriter, r *http.Request) {
	var event telemetry.Event
	if json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&event) != nil || event.ID == "" || len(event.ID) > 128 || event.Environment != os.Getenv("APP_ENV") {
		http.Error(w, "Invalid event", 400)
		return
	}
	if event.Transport == "" {
		event.Transport = "http"
	}
	h.publish(event)
	h.mu.Lock()
	h.broker.Ingested++
	h.mu.Unlock()
	w.WriteHeader(202)
}
func (h *hub) stream(w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return r.Header.Get("Origin") == "" }}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()
	conn.SetReadLimit(1024)
	ch := make(chan telemetry.Event, 256)
	h.mu.Lock()
	if len(h.clients) >= 50 {
		h.mu.Unlock()
		return
	}
	h.clients[ch] = true
	history := append([]telemetry.Event(nil), h.history...)
	h.mu.Unlock()
	defer func() { h.mu.Lock(); delete(h.clients, ch); h.mu.Unlock() }()
	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}()
	send := func(v any) error { conn.SetWriteDeadline(time.Now().Add(5 * time.Second)); return conn.WriteJSON(v) }
	if send(map[string]any{"type": "history", "events": history}) != nil {
		return
	}
	if send(map[string]any{"type": "broker", "broker": h.state()}) != nil {
		return
	}
	status := time.NewTicker(2 * time.Second)
	defer status.Stop()
	ticker := time.NewTicker(20 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-done:
			return
		case event := <-ch:
			if send(map[string]any{"type": "event", "event": event}) != nil {
				return
			}
		case <-status.C:
			if send(map[string]any{"type": "broker", "broker": h.state()}) != nil {
				return
			}
		case <-ticker.C:
			conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
			if conn.WriteMessage(websocket.PingMessage, nil) != nil {
				return
			}
		}
	}
}
func main() {
	h := &hub{clients: map[chan telemetry.Event]bool{}}
	if url, exchange, queue := os.Getenv("AMQP_URL"), os.Getenv("AMQP_EXCHANGE"), os.Getenv("AMQP_QUEUE"); url != "" && exchange != "" && queue != "" {
		go h.consume(url, exchange, queue)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200) })
	mux.HandleFunc("POST /ingest", h.ingest)
	mux.HandleFunc("GET /events", h.stream)
	httpapi.Serve(mux)
}
