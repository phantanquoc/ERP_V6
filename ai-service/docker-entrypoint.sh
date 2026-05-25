#!/bin/sh
# Fix volume permissions if owned by root (happens when upgrading from old container)
if [ -d /app/chroma_data ] && [ "$(stat -c '%u' /app/chroma_data)" != "$(id -u appuser)" ]; then
    chown -R appuser:appuser /app/chroma_data
fi

# Drop to non-root user and exec CMD
exec gosu appuser "$@"
