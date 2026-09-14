package main

import "study.local/shared/httpapi"

func main() {
	httpapi.Serve(httpapi.API("inventory", []map[string]any{{"product": "p-101", "available": 42}, {"product": "p-102", "available": 18}}))
}
