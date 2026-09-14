package main

import "study.local/shared/httpapi"

func main() {
	httpapi.Serve(httpapi.API("catalog", []map[string]any{{"id": "p-101", "name": "Mechanical keyboard", "price": 129}, {"id": "p-102", "name": "USB-C dock", "price": 89}}))
}
