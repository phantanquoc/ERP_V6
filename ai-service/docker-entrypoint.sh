#!/bin/sh
# Fix volume permissions if owned by root
for dir in /home/appuser/.cache /home/appuser/.deepface; do
    if [ -d "$dir" ] && [ "$(stat -c '%u' "$dir")" != "$(id -u appuser)" ]; then
        chown -R appuser:appuser "$dir"
    fi
done

# Drop to non-root user and exec CMD
exec gosu appuser "$@"
