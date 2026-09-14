.DEFAULT_GOAL := help
SHELL := /bin/bash
PROFILE := mesh-study
ENV ?= stg
APP ?=
# TAG overrides all app image tags only when explicitly supplied.
TAG ?=
BUILD_TAG = $(if $(TAG),$(TAG),dev)
PORT ?= $(if $(filter prd,$(ENV)),3001,3000)
GRAFANA_PORT ?= $(if $(filter prd,$(ENV)),3201,3200)
ISTIO_VERSION := 1.30.4
KUBERNETES_VERSION := v1.35.1
APPS := web catalog orders inventory payments reviews graphql grpc events authz
# Deployed from an upstream image: composed and operated, never built here.
EXTERNAL_APPS := rabbitmq prometheus grafana
MANAGED_APPS := $(APPS) $(EXTERNAL_APPS)
K := minikube -p $(PROFILE) kubectl -- --context=$(PROFILE)
H := helm --kube-context=$(PROFILE)

ifeq ($(filter $(ENV),stg prd),)
$(error ENV must be stg or prd; both run only on local profile mesh-study)
endif
ifneq ($(APP),)
ifeq ($(filter $(APP),$(MANAGED_APPS)),)
$(error APP must be one of: $(MANAGED_APPS))
endif
endif

.PHONY: help tools cluster secrets deps mesh gateway build deploy up up-all test lint render smoke smoke-all status logs authz-logs analyze serve port-forward grafana tokens restart config use stop delete
help:
	@echo 'ENV=stg (default) or ENV=prd; both use local Minikube only'
	@echo 'make up ENV=stg           Bootstrap and verify one environment'
	@echo 'make up-all               Bootstrap and verify both environments'
	@echo 'make build APP=catalog    Build/load one image (omit APP for all)'
	@echo 'make deploy ENV=stg       Apply all app/config/route changes to staging'
	@echo 'make restart APP=catalog ENV=stg  Restart one app after reusing an image tag'
	@echo 'make port-forward ENV=stg localhost:3000 (prd uses :3001)'
	@echo 'make tokens ENV=stg       Show environment-specific demo credentials'
	@echo 'make render ENV=prd       Render all manifests using dummy credentials'
	@echo 'make config APP=web ENV=stg  Inspect the app ConfigMap (no secrets)'
	@echo 'make use ENV=stg          Set local context and namespace'
	@echo 'make learn-watch ENV=stg  Refresh read-only source without deploying code'
	@echo 'make learn-sync ENV=stg   Publish source once; preserve active operations'
	@echo 'make watch ENV=stg        Auto-apply local app/platform deployment edits'
	@echo 'make grafana ENV=stg        Forward Grafana dashboards to a local port'
	@echo 'make status / logs APP=catalog / analyze / lint / test / smoke'
tools:
	HOMEBREW_NO_AUTO_UPDATE=1 brew install minikube helm istioctl kns fzf
cluster:
	minikube start -p $(PROFILE) --driver=docker --cpus=4 --memory=5632 --kubernetes-version=$(KUBERNETES_VERSION) --keep-context
secrets:
	@python3 scripts/generate_credentials.py $(ENV)
deps:
	@helm dependency update deploy/helm/platform --skip-refresh
mesh:
	helm repo add istio https://istio-release.storage.googleapis.com/charts --force-update
	helm repo update istio
	$(H) upgrade --install mesh-namespaces deploy/helm/namespaces -n istio-system --create-namespace --wait
	$(H) upgrade --install istio-base istio/base --version $(ISTIO_VERSION) -n istio-system --wait --timeout 5m
	$(H) upgrade --install istiod istio/istiod --version $(ISTIO_VERSION) -n istio-system -f deploy/istio/istiod-values.yaml --wait --timeout 5m
gateway:
	$(H) upgrade --install internal-gateway istio/gateway --version $(ISTIO_VERSION) -n $(ENV) -f deploy/istio/gateway-values.yaml -f deploy/environments/$(ENV)/gateway.yaml --wait --timeout 5m
build:
	@if [ -n "$(filter $(APP),$(EXTERNAL_APPS))" ]; then echo "$(APP) runs an upstream image; select its version in apps/$(APP)/deploy"; exit 1; fi
	@set -e; for app in $(if $(APP),$(APP),$(APPS)); do \
		revision=$$(python3 scripts/learning_catalog.py --revision $$app); \
		if [ "$$app" = web ]; then docker build --build-arg SOURCE_REVISION=$$revision -t mesh-study/$$app:$(BUILD_TAG) apps/web; \
		else docker build --build-arg SOURCE_REVISION=$$revision -t mesh-study/$$app:$(BUILD_TAG) -f apps/$$app/Dockerfile .; fi; \
		minikube -p $(PROFILE) image load mesh-study/$$app:$(BUILD_TAG); \
	done
deploy: secrets deps
	python3 scripts/local_lock.py $(ENV) python3 scripts/deploy_environment.py --env $(ENV) $(if $(TAG),--tag $(TAG),)
up:
	$(MAKE) cluster
	$(MAKE) mesh
	$(MAKE) gateway
	$(MAKE) build
	$(MAKE) deploy
	$(MAKE) restart
	$(MAKE) smoke
up-all:
	$(MAKE) cluster
	$(MAKE) mesh
	$(MAKE) build
	$(MAKE) gateway deploy restart ENV=stg
	$(MAKE) gateway deploy restart ENV=prd
	$(MAKE) smoke-all
test:
	cmp apps/grpc/proto/shipping.proto apps/web/proto/shipping.proto
	go test -race ./apps/shared/... ./apps/catalog/... ./apps/orders/... ./apps/inventory/... ./apps/authz/... ./apps/graphql/... ./apps/grpc/... ./apps/events/...
	npm run typecheck --prefix apps/web
	python3 -m unittest discover -s scripts -p 'test_learning*.py'
	node scripts/check_journey.cjs
lint: deps
	python3 scripts/helm_environment.py lint --env stg
	python3 scripts/helm_environment.py lint --env prd
	python3 scripts/learning_catalog.py --check --env stg
	python3 scripts/learning_catalog.py --check --env prd
	helm lint apps/web/deploy/learning-helm --set-string workspace=dGVzdA==,active=dGVzdA==
render:
	@helm dependency update deploy/helm/platform --skip-refresh > /dev/null
	@python3 scripts/helm_environment.py render --env $(ENV) $(if $(TAG),--tag $(TAG),)
smoke:
	python3 scripts/smoke.py --env $(ENV)
smoke-all:
	python3 scripts/smoke.py --env stg
	python3 scripts/smoke.py --env prd
	python3 scripts/check_isolation.py
status:
	$(K) -n $(ENV) get pods,svc,gateway,virtualservice,authorizationpolicy
logs:
	$(K) -n $(ENV) logs deployment/$(if $(APP),$(APP),web) -c $(if $(APP),$(APP),web) --tail=50
authz-logs:
	$(K) -n $(ENV) logs deployment/authz -c authz --tail=50
analyze:
	istioctl --context=$(PROFILE) analyze -n $(ENV)
serve: port-forward
port-forward:
	python3 scripts/port_forward.py --env $(ENV) --port $(PORT)
grafana:
	@python3 -c 'import json;c=json.load(open(".local/$(ENV)/grafana-secrets.json"))["grafana"]["credentials"];print("grafana login: "+c["username"]+" / "+c["password"])'
	python3 scripts/port_forward.py --env $(ENV) --port $(GRAFANA_PORT) --service grafana --target 3000
tokens:
	@python3 -c 'import json; d=json.load(open(".local/$(ENV)/authz-secrets.json"))["authz"]["credentials"]; print("$(ENV) admin: "+d["adminToken"]+"\n$(ENV) reader: "+d["readerToken"])'
restart:
	$(K) -n $(ENV) rollout restart deployment $(if $(APP),$(APP),-l app.kubernetes.io/instance=study)
	$(K) -n $(ENV) rollout status deployment $(if $(APP),$(APP),-l app.kubernetes.io/instance=study) --timeout=180s
config:
	$(K) -n $(ENV) get configmap $(if $(APP),$(APP),web)-config -o yaml
use:
	$(K) config use-context $(PROFILE)
	$(K) config set-context $(PROFILE) --namespace=$(ENV)
stop:
	minikube stop -p $(PROFILE)
delete:
	minikube delete -p $(PROFILE)

.PHONY: watch
watch:
	python3 scripts/watch.py --env $(ENV)

.PHONY: proto
proto:
	@mkdir -p .local/protoc-bin
	GOBIN=$(CURDIR)/.local/protoc-bin go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.36.8
	GOBIN=$(CURDIR)/.local/protoc-bin go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.5.1
	PATH="$(CURDIR)/.local/protoc-bin:$$PATH" protoc -I apps/grpc/proto --go_out=apps/grpc --go_opt=module=study.local/grpc --go-grpc_out=apps/grpc --go-grpc_opt=module=study.local/grpc apps/grpc/proto/shipping.proto
	cp apps/grpc/proto/shipping.proto apps/web/proto/shipping.proto

.PHONY: learn-sync learn-watch
learn-sync:
	python3 scripts/local_lock.py $(ENV) python3 scripts/learning_sync.py --env $(ENV)
learn-watch:
	python3 scripts/watch.py --env $(ENV) --learn
