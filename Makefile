NMB = node_modules/.bin

.SILENT:
.PHONY: help build test

help:
	echo "targets:"
	echo ""
	echo "   make build"
	echo "   make test"

build:
	mkdir -p tmp
	cp node_modules/jquery/dist/jquery.min.js docs/jquery.js

	echo "running browserify"
	${NMB}/browserify \
		lib/web/main.js \
		--debug \
		--outfile tmp/modules.js \
		--transform babelify

	echo "running exorcist"
	${NMB}/exorcist docs/app.js.map.json \
		< tmp/modules.js \
		> docs/app.js

	echo "running lessc"
	${NMB}/lessc css/app.less docs/app.css

test:
	echo "running standard"
	${NMB}/standard -v

	tools/utest-quiet.sh

watchTask:
	time make build
	echo ""
	time make test
