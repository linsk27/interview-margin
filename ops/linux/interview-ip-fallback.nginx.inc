location = /interview {
    return 302 /interview/;
}

location ^~ /interview/api/ {
    proxy_pass http://127.0.0.1:4173/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_read_timeout 75s;
}

location ^~ /interview/ {
    root /opt/interview-margin/ip-fallback;
    try_files $uri $uri/ /interview/index.html;
}
