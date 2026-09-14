package main

import (
	"encoding/json"
	"github.com/graphql-go/graphql"
	"net/http"
	"os"
	"study.local/shared/httpapi"
)

func handler() http.Handler {
	product := graphql.NewObject(graphql.ObjectConfig{Name: "Product", Fields: graphql.Fields{
		"id": &graphql.Field{Type: graphql.String}, "name": &graphql.Field{Type: graphql.String}, "price": &graphql.Field{Type: graphql.Float},
	}})
	schema, err := graphql.NewSchema(graphql.SchemaConfig{Query: graphql.NewObject(graphql.ObjectConfig{Name: "Query", Fields: graphql.Fields{
		"environment": &graphql.Field{Type: graphql.String, Resolve: func(p graphql.ResolveParams) (any, error) { return os.Getenv("APP_ENV"), nil }},
		"products": &graphql.Field{Type: graphql.NewList(product), Args: graphql.FieldConfigArgument{"maxPrice": &graphql.ArgumentConfig{Type: graphql.Float}}, Resolve: func(p graphql.ResolveParams) (any, error) {
			all := []map[string]any{{"id": "p-101", "name": "Mechanical keyboard", "price": 129.0}, {"id": "p-102", "name": "USB-C dock", "price": 89.0}}
			result := []map[string]any{}
			for _, item := range all {
				if max, ok := p.Args["maxPrice"].(float64); !ok || item["price"].(float64) <= max {
					result = append(result, item)
				}
			}
			return result, nil
		}},
	}})})
	if err != nil {
		panic(err)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200) })
	mux.HandleFunc("POST /graphql", func(w http.ResponseWriter, r *http.Request) {
		var input struct {
			Query         string         `json:"query"`
			Variables     map[string]any `json:"variables"`
			OperationName string         `json:"operationName"`
		}
		if json.NewDecoder(http.MaxBytesReader(w, r.Body, 65536)).Decode(&input) != nil {
			http.Error(w, "Invalid GraphQL request", 400)
			return
		}
		result := graphql.Do(graphql.Params{Schema: schema, RequestString: input.Query, VariableValues: input.Variables, OperationName: input.OperationName, Context: r.Context()})
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	})
	return mux
}
func main() { httpapi.Serve(handler()) }
