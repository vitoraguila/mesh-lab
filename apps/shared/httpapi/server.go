package httpapi

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"study.local/shared/telemetry"
	"syscall"
	"time"
)

func Serve(handler http.Handler) {
	// Every application exposes the same metrics endpoint. The Istio sidecar
	// scrapes it locally and merges it with its own Envoy metrics.
	mux := http.NewServeMux()
	mux.Handle("GET /metrics", telemetry.Handler())
	mux.Handle("/", handler)
	server := &http.Server{Addr: ":" + envOr("HTTP_PORT", "8080"), Handler: telemetry.Middleware(mux), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: seconds("READ_TIMEOUT_SECONDS", 10), WriteTimeout: 10 * time.Second, IdleTimeout: 60 * time.Second}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		drain, cancel := context.WithTimeout(context.Background(), seconds("SHUTDOWN_TIMEOUT_SECONDS", 5))
		defer cancel()
		_ = server.Shutdown(drain)
	}()
	log.Printf("listening on %s environment=%s", server.Addr, envOr("APP_ENV", "local"))
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

func API(name string, data any) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	mux.HandleFunc("GET /"+name, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"service": name, "version": envOr("SERVICE_VERSION", "v1"), "environment": envOr("APP_ENV", "local"), "data": data, "pod": os.Getenv("HOSTNAME")})
	})
	return mux
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func seconds(key string, fallback int) time.Duration {
	raw := envOr(key, strconv.Itoa(fallback))
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		log.Fatalf("%s must be a positive integer", key)
	}
	return time.Duration(value) * time.Second
}
