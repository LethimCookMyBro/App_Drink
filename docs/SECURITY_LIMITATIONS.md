# Security Limitations

## Adult Content

The server requires an authenticated app user before creating an 18+ room or
receiving adult questions from an 18+ room. This is an access gate only. The app
does not currently store a verified adult status or perform legal age
verification.

Production deployments that need age-restricted compliance must add a verified
adult flag or integrate an age-verification provider before enabling 18+
content.
