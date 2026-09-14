// Package telemetry reports bounded, best-effort metadata. It never handles credentials.
package telemetry

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"
)

var SourceRevision = "unknown"

type Event struct {
	EventID        string `json:"eventId,omitempty"`
	SourceRevision string `json:"sourceRevision,omitempty"`
	StatusKind     string `json:"statusKind,omitempty"`
	ID             string `json:"requestId"`
	Service        string `json:"service"`
	Stage          string `json:"stage"`
	Path           string `json:"path"`
	Status         int    `json:"status"`
	Time           string `json:"time"`
	Environment    string `json:"environment"`
	// Transport metadata. Present only for the path the event actually took.
	Transport   string `json:"transport,omitempty"`
	Exchange    string `json:"exchange,omitempty"`
	RoutingKey  string `json:"routingKey,omitempty"`
	Queue       string `json:"queue,omitempty"`
	PublishedAt string `json:"publishedAt,omitempty"`
	DeliveredAt string `json:"deliveredAt,omitempty"`
}

var queue = make(chan Event, 256)
var once sync.Once

func Emit(id, service, stage, path string, status int) {
	url, exchange, broker := brokerEnabled()
	if (!broker && os.Getenv("EVENTS_URL") == "") || id == "" || len(id) > 128 {
		return
	}
	once.Do(func() {
		// The broker is the normal transport. Direct HTTP remains available so a
		// single service can still be run without one.
		if broker {
			go publishLoop(url, exchange, queue)
			return
		}
		go func() {
			client := &http.Client{Timeout: 500 * time.Millisecond}
			for event := range queue {
				event.Transport = "http"
				raw, _ := json.Marshal(event)
				response, err := client.Post(os.Getenv("EVENTS_URL"), "application/json", bytes.NewReader(raw))
				if err == nil {
					response.Body.Close()
				}
			}
		}()
	})
	statusKind := "http"
	if service == "grpc" {
		statusKind = "grpc"
	}
	event := Event{EventID: rand.Text(), SourceRevision: SourceRevision, StatusKind: statusKind, ID: id, Service: service, Stage: stage, Path: path, Status: status, Time: time.Now().UTC().Format(time.RFC3339Nano), Environment: os.Getenv("APP_ENV")}
	select {
	case queue <- event:
		countEvent(stage)
	default:
	}
}

type recorder struct {
	http.ResponseWriter
	status int
}

func (w *recorder) WriteHeader(status int) { w.status = status; w.ResponseWriter.WriteHeader(status) }
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Probes and scrapes are infrastructure traffic: never events, never metrics.
		if r.URL.Path == "/healthz" || r.URL.Path == "/metrics" {
			next.ServeHTTP(w, r)
			return
		}
		service := os.Getenv("SERVICE_NAME")
		if service == "" {
			next.ServeHTTP(w, r)
			return
		}
		id := r.Header.Get("x-mesh-request-id")
		stage := "received"
		if service == "authz" {
			stage = "check"
		}
		Emit(id, service, stage, r.URL.Path, 0)
		out := &recorder{w, 200}
		started := time.Now()
		next.ServeHTTP(out, r)
		observe(r.URL.Path, strconv.Itoa(out.status), time.Since(started))
		stage = "completed"
		if service == "authz" {
			stage = "denied"
			if out.status == 200 {
				stage = "allowed"
			}
		}
		Emit(id, service, stage, r.URL.Path, out.status)
	})
}
