.DEFAULT_GOAL := build

node_modules:
	@npm install

build: node_modules
	@npx flow
