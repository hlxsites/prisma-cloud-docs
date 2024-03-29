Adds a certificate to the list of explicitly trusted certificates.

Use this endpoint to control how users authenticate to Prisma Cloud Compute.
Users employ client certificates to authenticate commands sent from a Docker client through Prisma Cloud Compute.

> **_NOTE:_** You can only add a custom certificate if the trusted certificates mode is enabled.
For more information, see the `/settings/trusted-certificates` endpoint.

## cURL Request

Refer to the following example cURL request that uses basic auth to add a certificate to the list:

```bash
curl -k \
  -u <USER> \
  -H 'Content-Type: application/json' \
  -w "\nResponse code: %{http_code}\n" \
  -X POST \
  -d '{"certificate": "-----BEGIN CERTIFICATE-----\nMIIDUTCCAjmgAwIBAgI......XMKXJA==\n-----END CERTIFICATE-----" }'
  "https://<CONSOLE>/api/v<VERSION>/settings/trusted-certificate"
```
