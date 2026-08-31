#!/usr/bin/env bash
set -euo pipefail

public_health_url="https://interview.linsk27.dpdns.org/api/health"
service_name="cloudflared-interview-margin.service"

for attempt in 1 2 3; do
  if curl --fail --silent --show-error --output /dev/null --max-time 15 "$public_health_url"; then
    exit 0
  fi
  if [[ "$attempt" -lt 3 ]]; then
    sleep 10
  fi
done

logger -t cloudflared-healthcheck "public health check failed three times; restarting ${service_name}"
systemctl restart "$service_name"
