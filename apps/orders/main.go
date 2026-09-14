package main

import "study.local/shared/httpapi"

func main() {
	httpapi.Serve(httpapi.API("orders", []map[string]any{{"id": "o-501", "product": "p-101", "status": "shipped"}, {"id": "o-502", "product": "p-102", "status": "processing"}}))
}
