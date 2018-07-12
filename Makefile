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
# append \t to avoid collisions in the cache/flakes.current.txt rule
	grep success$$ $< | cut -f1-4 | sort -u | sed "s/\$$/$$(printf '\t')/" >$@
.INTERMEDIATE: cache/prowjobs.success.txt

cache/prowjobs.failure.txt: cache/prowjobs.txt
	grep failure$$ $< | cut -f1-5 | sort -u >$@
.INTERMEDIATE: cache/prowjobs.failure.txt

cache/flakes.current.txt: cache/prowjobs.success.txt cache/prowjobs.failure.txt
	grep -Ff cache/prowjobs.success.txt cache/prowjobs.failure.txt >$@ || true

db/:
	mkdir -p $@

db/flakes.txt: cache/flakes.current.txt | db/
	touch db/flakes.txt
	wc -l db/flakes.txt
	sort -u $@ $< >$@.$$$$.tmp && (diff -u $@ $@.$$$$.tmp | grep '^+'; true) && mv $@.$$$$.tmp $@
	wc -l db/flakes.txt

jobs/:
	mkdir -p $@

jobs/%/prowjob.json: | jobs/
	mkdir -p "$(dir $@)"
	$(TOOLS)/makefile.sh $@ $(TOOLS)/select-prowjob.sh ./cache/prowjobs.json $* || true
.PRECIOUS: jobs/%/prowjob.json

jobs/%/openshift-gce.url: | jobs/%/prowjob.json
	test -e $@ || ! test -e ./jobs/$*/prowjob.json || $(TOOLS)/makefile.sh $@ $(TOOLS)/check-url.sh openshift-gce "$$(jq -r .status.url ./jobs/$*/prowjob.json)" || true
.PRECIOUS: jobs/%/openshift-gce.url

jobs/%/openshift-gce.clone-records.json: | jobs/%/openshift-gce.url
	test -e $| && $(TOOLS)/makefile.sh $@ curl -fsS "$$(cat $| | sed -n 's,build-log\.txt$$,clone-records.json,p')" || true
.PRECIOUS: jobs/%/openshift-gce.clone-records.json

jobs/%/jenkins.url:
	test -e $@ || $(TOOLS)/makefile.sh $@ $(TOOLS)/check-url.sh jenkins "https://ci.openshift.redhat.com/jenkins/job/$*/consoleText" || true
.PRECIOUS: jobs/%/jenkins.url

jobs/%/raw: | jobs/%/openshift-gce.url jobs/%/jenkins.url
	err=1; for url in $|; do \
		test -e "$$url" && cat "$$url" >&2 && $(TOOLS)/makefile.sh $@ curl -fsS "$$(cat "$$url")" && err=0 && break || err=$$?; \
	done && exit $$err
.PRECIOUS: jobs/%/raw

jobs/%/segments.json: jobs/%/raw $(if $(FORCE),FORCE)
	$(TOOLS)/makefile.sh $@ $(SEGMENTATOR) $<
	$(RECORD_FAILURES) $*
.PRECIOUS: jobs/%/segments.json

refresh: cache/prowjobs.json
	set -e; find ./jobs -type f -name 'raw' | while read -r f; do \
		f=$${f#./jobs/}; f=$${f%/raw}; \
		$(MAKE) jobs/$$f/segments.json jobs/$$f/prowjob.json jobs/$$f/openshift-gce.url jobs/$$f/openshift-gce.clone-records.json; \
	done
.PHONY: refresh

load-flakes: db/flakes.txt
	set -e; cat $< | cut -d"$$(printf '\t')" -f4-5 | while read -r a b; do \
		$(MAKE) jobs/$$a/$$b/segments.json || true; \
		touch jobs/$$a/$$b/flake.flag; \
	done
.PHONY: load-flakes

load-failures: cache/prowjobs.failure.txt
	set -e; cat $< | cut -d"$$(printf '\t')" -f4-5 | while read -r a b; do \
		$(MAKE) jobs/$$a/$$b/segments.json || true; \
	done
.PHONY: load-failures

clean:
	find . -name '*.tmp' -or -name 'segments.json' -print -delete
.PHONY: clean

FORCE:
.PHONY: FORCE

CACHE_TTL_MINUTES=10

.SECONDEXPANSION:

cache/prowjobs.json: $$(shell test -e $$@ && find $$@ -type f -mmin -$(CACHE_TTL_MINUTES) | grep -q ^ || echo FORCE)
