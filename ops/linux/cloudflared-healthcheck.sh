#!/usr/bin/env bash
set -euo pipefail

public_health_url="https://interview.linsk27.dpdns.org/api/health"
service_name="cloudflared-interview-margin.service"

if curl --fail --silent --show-error --output /dev/null --max-time 15 "$public_health_url"; then
  exit 0
fi

logger -t cloudflared-healthcheck "public health check failed; restarting ${service_name}"
systemctl restart "$service_name"
