package main

import (
	"net/http/httptest"
	"testing"
)

func TestAuthorization(t *testing.T) {
	// The method rule is configuration: paths absent from Methods accept GET only.
	handler := authorize(Policy{
		Methods: map[string][]string{
			"/graphql":                           {"POST"},
			"/shipping.v1.ShippingService/Quote": {"POST"},
			"/payments":                          {"GET", "POST"},
		},
		Identities: []Identity{{Subject: "reader", Token: "secret", Paths: []string{"/catalog", "/graphql", "/shipping.v1.ShippingService/Quote", "/payments"}}},
	})
	for _, tc := range []struct {
		name, method, path, header string
		status                     int
	}{
		{"graphql", "POST", "/graphql", "Bearer secret", 200},
		{"rpc", "POST", "/shipping.v1.ShippingService/Quote", "Bearer secret", 200},
		{"graphql wrong method", "GET", "/graphql", "Bearer secret", 403},
		{"rpc wrong method", "GET", "/shipping.v1.ShippingService/Quote", "Bearer secret", 403},
		{"rpc unknown method", "POST", "/shipping.v1.ShippingService/Admin", "Bearer secret", 403},
		{"allowed", "GET", "/catalog", "Bearer secret", 200},
		{"missing", "GET", "/catalog", "", 403},
		{"invalid", "GET", "/catalog", "Bearer wrong", 403},
		{"wrong scheme", "GET", "/catalog", "Basic secret", 403},
		{"scope", "GET", "/orders", "Bearer secret", 403},
		{"write", "POST", "/catalog", "Bearer secret", 403},
		{"configured read and write", "GET", "/payments", "Bearer secret", 200},
		{"configured write", "POST", "/payments", "Bearer secret", 200},
		{"method not configured", "DELETE", "/payments", "Bearer secret", 403},
		{"prefix bypass", "GET", "/catalog/extra", "Bearer secret", 403},
	} {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest(tc.method, tc.path, nil)
			r.Header.Set("Authorization", tc.header)
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, r)
			if w.Code != tc.status {
				t.Fatalf("got %d want %d", w.Code, tc.status)
			}
			if w.Code == 200 && w.Header().Get("x-auth-subject") != "reader" {
				t.Fatal("missing verified subject")
			}
		})
	}
}
