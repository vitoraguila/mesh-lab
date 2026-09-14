package main

import (
	"crypto/subtle"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"study.local/shared/httpapi"
)

type Identity struct {
	Subject string   `json:"subject"`
	Token   string   `json:"token"`
	Paths   []string `json:"paths"`
}
type Policy struct {
	Identities []Identity `json:"identities"`
	// Methods each path accepts, keyed by path. Configuration, not code: a new
	// operation is a policy change. Paths absent here accept GET only.
	Methods map[string][]string `json:"methods"`
}

func authorize(policy Policy) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/healthz" {
			w.WriteHeader(200)
			return
		}
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !strings.HasPrefix(r.Header.Get("Authorization"), "Bearer ") {
			token = ""
		}
		for _, identity := range policy.Identities {
			if token == "" || subtle.ConstantTimeCompare([]byte(token), []byte(identity.Token)) != 1 {
				continue
			}
			for _, path := range identity.Paths {
				if r.URL.Path == path && policy.allows(r.Method, path) {
					w.Header().Set("x-auth-subject", identity.Subject)
					log.Printf("decision=allow subject=%s method=%s path=%s", identity.Subject, r.Method, r.URL.Path)
					w.WriteHeader(http.StatusOK)
					return
				}
			}
		}
		log.Printf("decision=deny method=%s path=%s", r.Method, r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_, _ = w.Write([]byte(`{"error":"Forbidden by centralized mesh authorization"}`))
	})
}

func main() {
	path := os.Getenv("AUTHZ_POLICY_PATH")
	if path == "" {
		path = "/etc/authz/policy.json"
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		log.Fatal(err)
	}
	var policy Policy
	if err = json.Unmarshal(raw, &policy); err != nil {
		log.Fatal(err)
	}
	if len(policy.Identities) == 0 {
		log.Fatal("empty authorization policy")
	}
	for _, id := range policy.Identities {
		if id.Token == "" {
			log.Fatal("empty token")
		}
	}
	httpapi.Serve(authorize(policy))
}

func (p Policy) allows(method, path string) bool {
	configured, found := p.Methods[path]
	if !found {
		return method == http.MethodGet
	}
	for _, allowed := range configured {
		if strings.EqualFold(allowed, method) {
			return true
		}
	}
	return false
}
