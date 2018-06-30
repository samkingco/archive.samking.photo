NODE_ENV ?= development
LOCAL_IMAGE_SERVER_PORT ?= 4000
CONTENT_DIR ?= content
API_SERVICE_DIR ?= services/sk-api
ASSETS_SERVICE_DIR ?= services/sk-assets
export

build-api:
	@echo "→ Building API content"
	node scripts/build-api.js

start-api:
	@echo "→ Starting api server"
	cd $(API_SERVICE_DIR) && serverless offline start

start-lis:
	@echo "→ Starting local image server"
	node services/sk-local-image-server

deploy-assets:
	@echo "→ Deploying API assets"
	cd $(ASSETS_SERVICE_DIR) && serverless deploy

deploy-api-dev:
	@echo "→ Deploying API to dev stage"
	cd $(API_SERVICE_DIR) && serverless deploy --stage dev

deploy-api-prod:
	@echo "→ Deploying API to prod stage"
	cd $(API_SERVICE_DIR) && serverless deploy --stage prod
