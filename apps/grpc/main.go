package main

import (
	"context"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"log"
	"math"
	"net"
	"net/http"
	"os"
	"os/signal"
	shipping "study.local/grpc/gen"
	"study.local/shared/telemetry"
	"syscall"
	"time"
)

type shippingServer struct {
	shipping.UnimplementedShippingServiceServer
}

func (shippingServer) Quote(ctx context.Context, r *shipping.QuoteRequest) (*shipping.QuoteResponse, error) {
	if r.Destination != "PT" && r.Destination != "US" && r.Destination != "DE" {
		return nil, status.Error(codes.InvalidArgument, "Choose PT, DE or US")
	}
	if math.IsNaN(r.WeightKg) || math.IsInf(r.WeightKg, 0) || r.WeightKg <= 0 || r.WeightKg > 100 {
		return nil, status.Error(codes.InvalidArgument, "Weight must be between 0 and 100 kg")
	}
	base, days := 5.0, int32(2)
	if r.Destination == "DE" {
		base, days = 9, 4
	}
	if r.Destination == "US" {
		base, days = 18, 7
	}
	return &shipping.QuoteResponse{Destination: r.Destination, Price: math.Round((base+r.WeightKg*2.5)*100) / 100, EstimatedDays: days, Environment: os.Getenv("APP_ENV"), Currency: "EUR"}, nil
}
func main() {
	server := grpc.NewServer(grpc.MaxRecvMsgSize(65536), grpc.UnaryInterceptor(func(ctx context.Context, req any, info *grpc.UnaryServerInfo, next grpc.UnaryHandler) (any, error) {
		md, _ := metadata.FromIncomingContext(ctx)
		id := ""
		if values := md.Get("x-mesh-request-id"); len(values) > 0 {
			id = values[0]
		}
		telemetry.Emit(id, "grpc", "received", info.FullMethod, 0)
		response, err := next(ctx, req)
		telemetry.Emit(id, "grpc", "completed", info.FullMethod, int(status.Code(err)))
		return response, err
	}))
	shipping.RegisterShippingServiceServer(server, shippingServer{})
	listener, err := net.Listen("tcp", ":8080")
	if err != nil {
		log.Fatal(err)
	}
	health := &http.Server{Addr: ":8081", ReadHeaderTimeout: 5 * time.Second, Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/healthz" {
			http.NotFound(w, r)
			return
		}
		w.WriteHeader(200)
	})}
	go func() {
		if err := health.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		timer := time.AfterFunc(5*time.Second, server.Stop)
		server.GracefulStop()
		timer.Stop()
		health.Close()
	}()
	if err := server.Serve(listener); err != nil {
		log.Fatal(err)
	}
}
