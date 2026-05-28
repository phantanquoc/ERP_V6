#!/bin/sh
# Fix volume permissions if owned by root (happens when upgrading from old container)
for dir in /app/chroma_data /home/appuser/.cache; do
    if [ -d "$dir" ] && [ "$(stat -c '%u' "$dir")" != "$(id -u appuser)" ]; then
        chown -R appuser:appuser "$dir"
    fi
done

# Drop to non-root user and exec CMD
exec gosu appuser "$@"
