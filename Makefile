TOOLS=./tools
RECORD_FAILURES=./database/record-failures.js
SEGMENTATOR=./segmentator/run.js

define download
curl -fsS $(1) >$(2).$$$$.tmp && mv $(2).$$$$.tmp $(2)
endef

all: db/flakes.txt

cache/:
	mkdir -p $@

cache/prowjobs.json: | cache/
	$(call download,"https://deck-ci.svc.ci.openshift.org/prowjobs.js",$@)

cache/prowjobs.txt: cache/prowjobs.json $(TOOLS)/jobs.sh
	$(TOOLS)/jobs.sh $< >$@

cache/prowjobs.success.txt: cache/prowjobs.txt
	cat $< | grep success | cut -f1-4 | sort -u >$@
.INTERMEDIATE: cache/prowjobs.success.txt

cache/flakes.current.txt: cache/prowjobs.txt cache/prowjobs.success.txt
	grep -Ff cache/prowjobs.success.txt cache/prowjobs.txt | grep failure >$@

db/:
	mkdir -p $@

db/flakes.txt: cache/flakes.current.txt | db/
	touch db/flakes.txt
	wc -l db/flakes.txt
	sort -u $@ $< >$@.tmp && (diff -u $@ $@.tmp | grep '^+'; true) && mv $@.tmp $@
	wc -l db/flakes.txt

jobs/:
	mkdir -p $@

jobs/%/info.json: | cache/prowjobs.txt jobs/
	mkdir -p "$(dir $@)"
	$(TOOLS)/make-info.sh $* >$@.tmp && mv $@.tmp $@
.PRECIOUS: jobs/%/info.json

jobs/%/raw: jobs/%/info.json
	if OUT=$$(curl -fsS $(shell $(TOOLS)/get-info-raw-url.sh jobs/$*/info.json) -o $@.tmp 2>&1); then \
		mv $@.tmp $@; \
	elif echo "$$OUT" | grep -q "The requested URL returned error: 404"; then \
		curl -fsS $$($(TOOLS)/get-fallback-raw-url.sh $*) -o $@.tmp && mv $@.tmp $@; \
	fi
.PRECIOUS: jobs/%/raw

jobs/%/segments.json: jobs/%/raw
	$(SEGMENTATOR) $< >$@.$$$$.tmp && mv $@.$$$$.tmp $@
	$(RECORD_FAILURES) $*
.PRECIOUS: jobs/%/segments.json

refresh:
	set -e; find ./jobs -type f -name 'raw' | while read -r f; do \
		f=$${f#./jobs/}; f=$${f%/raw}; \
		echo $$f; \
		echo seg; $(SEGMENTATOR) ./jobs/$$f/raw >./jobs/$$f/segments.json.$$$$.tmp && mv ./jobs/$$f/segments.json.$$$$.tmp ./jobs/$$f/segments.json; \
		echo rec; $(RECORD_FAILURES) $$f; \
	done
.PHONY: refresh

clean:
	find . -name '*.tmp' -or -name 'segments.json' -print -delete
.PHONY: clean

FORCE:
.PHONY: FORCE

CACHE_TTL_MINUTES=10

.SECONDEXPANSION:

cache/prowjobs.json: $$(shell test -e $$@ && find $$@ -type f -mmin -$(CACHE_TTL_MINUTES) | grep -q ^ || echo FORCE)
