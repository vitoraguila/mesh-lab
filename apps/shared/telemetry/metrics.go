// Prometheus exposition for the business APIs. Hand-written on purpose: the
// exposition format is small, and this keeps the study images dependency-free.
// The sidecar scrapes this endpoint locally and merges it with Envoy's own
// metrics, so Prometheus only ever talks to port 15020.
package telemetry

import (
	"fmt"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"
)

var buckets = []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5}

type key struct{ path, code string }

type series struct {
	count   uint64
	sum     float64
	bucket  []uint64
	touched bool
}

var metrics = struct {
	sync.Mutex
	requests map[key]*series
	events   map[string]uint64
}{requests: map[key]*series{}, events: map[string]uint64{}}

func observe(path, code string, elapsed time.Duration) {
	metrics.Lock()
	defer metrics.Unlock()
	// Bound the label space: only registered paths are ever recorded.
	if len(metrics.requests) > 64 {
		return
	}
	entry := metrics.requests[key{path, code}]
	if entry == nil {
		entry = &series{bucket: make([]uint64, len(buckets))}
		metrics.requests[key{path, code}] = entry
	}
	seconds := elapsed.Seconds()
	entry.count++
	entry.sum += seconds
	for i, edge := range buckets {
		if seconds <= edge {
			entry.bucket[i]++
		}
	}
}

func countEvent(stage string) {
	metrics.Lock()
	defer metrics.Unlock()
	if len(metrics.events) <= 16 {
		metrics.events[stage]++
	}
}

func escape(value string) string {
	return strings.NewReplacer(`\`, `\\`, `"`, `\"`, "\n", `\n`).Replace(value)
}

// Handler renders the current counters. It is registered by httpapi.Serve, so
// every Go application in the mesh exposes the same series.
func Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		service := escape(os.Getenv("SERVICE_NAME"))
		environment := escape(os.Getenv("APP_ENV"))
		var out strings.Builder
		out.WriteString("# HELP mesh_build_info Source revision the running workload was built from.\n# TYPE mesh_build_info gauge\n")
		fmt.Fprintf(&out, "mesh_build_info{service=%q,environment=%q,revision=%q} 1\n", service, environment, escape(SourceRevision))

		metrics.Lock()
		defer metrics.Unlock()
		ordered := make([]key, 0, len(metrics.requests))
		for item := range metrics.requests {
			ordered = append(ordered, item)
		}
		sort.Slice(ordered, func(a, b int) bool {
			if ordered[a].path != ordered[b].path {
				return ordered[a].path < ordered[b].path
			}
			return ordered[a].code < ordered[b].code
		})

		out.WriteString("# HELP mesh_requests_total Requests handled by this application, after the mesh allowed them.\n# TYPE mesh_requests_total counter\n")
		for _, item := range ordered {
			fmt.Fprintf(&out, "mesh_requests_total{service=%q,environment=%q,path=%q,code=%q} %d\n",
				service, environment, escape(item.path), escape(item.code), metrics.requests[item].count)
		}

		out.WriteString("# HELP mesh_request_duration_seconds Handler latency, excluding the mesh hops in front of it.\n# TYPE mesh_request_duration_seconds histogram\n")
		for _, item := range ordered {
			entry := metrics.requests[item]
			for i, edge := range buckets {
				fmt.Fprintf(&out, "mesh_request_duration_seconds_bucket{service=%q,environment=%q,path=%q,code=%q,le=\"%g\"} %d\n",
					service, environment, escape(item.path), escape(item.code), edge, entry.bucket[i])
			}
			fmt.Fprintf(&out, "mesh_request_duration_seconds_bucket{service=%q,environment=%q,path=%q,code=%q,le=\"+Inf\"} %d\n",
				service, environment, escape(item.path), escape(item.code), entry.count)
			fmt.Fprintf(&out, "mesh_request_duration_seconds_sum{service=%q,environment=%q,path=%q,code=%q} %g\n",
				service, environment, escape(item.path), escape(item.code), entry.sum)
			fmt.Fprintf(&out, "mesh_request_duration_seconds_count{service=%q,environment=%q,path=%q,code=%q} %d\n",
				service, environment, escape(item.path), escape(item.code), entry.count)
		}

		stages := make([]string, 0, len(metrics.events))
		for stage := range metrics.events {
			stages = append(stages, stage)
		}
		sort.Strings(stages)
		out.WriteString("# HELP mesh_events_published_total Telemetry events this application queued for the broker.\n# TYPE mesh_events_published_total counter\n")
		for _, stage := range stages {
			fmt.Fprintf(&out, "mesh_events_published_total{service=%q,environment=%q,stage=%q} %d\n", service, environment, escape(stage), metrics.events[stage])
		}

		w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write([]byte(out.String()))
	})
}
