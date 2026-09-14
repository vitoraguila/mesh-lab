package main

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestQueries(t *testing.T) {
	for _, tc := range []struct {
		body    string
		count   int
		invalid bool
	}{
		{`{"query":"query($max:Float!){products(maxPrice:$max){name}}","variables":{"max":100}}`, 1, false},
		{`{"query":"{products{name price}}"}`, 2, false},
		{`{"query":"{unknown}"}`, 0, true},
		{`{"query":"mutation { products { name } }"}`, 0, true},
	} {
		w := httptest.NewRecorder()
		handler().ServeHTTP(w, httptest.NewRequest("POST", "/graphql", strings.NewReader(tc.body)))
		var result struct {
			Data   struct{ Products []map[string]any }
			Errors []any
		}
		if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		if (len(result.Errors) > 0) != tc.invalid || len(result.Data.Products) != tc.count {
			t.Fatal(w.Body.String())
		}
	}
}
