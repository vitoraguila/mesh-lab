package main

import (
	"context"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	shipping "study.local/grpc/gen"
	"testing"
)

func TestQuote(t *testing.T) {
	s := shippingServer{}
	r, err := s.Quote(context.Background(), &shipping.QuoteRequest{Destination: "PT", WeightKg: 2})
	if err != nil || r.Price != 10 || r.EstimatedDays != 2 {
		t.Fatalf("%v %v", r, err)
	}
	for _, request := range []*shipping.QuoteRequest{{Destination: "XX", WeightKg: 1}, {Destination: "PT", WeightKg: 0}, {Destination: "US", WeightKg: 101}} {
		_, err := s.Quote(context.Background(), request)
		if status.Code(err) != codes.InvalidArgument {
			t.Fatal(err)
		}
	}
}
