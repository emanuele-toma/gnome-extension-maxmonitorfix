#!/bin/sh
set -e
root=$(cd "$(dirname "$0")/.." && pwd)
schemas=$(mktemp -d)
trap 'rm -rf "$schemas"' EXIT
cp "$root"/maxmonitorfix@emanuele-toma.github.io/schemas/*.xml "$schemas"
glib-compile-schemas --strict "$schemas"
export GSETTINGS_BACKEND=memory GSETTINGS_SCHEMA_DIR="$schemas"
for test in "$root"/tests/*.test.js; do
    gjs -m "$test"
done
