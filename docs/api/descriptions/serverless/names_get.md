Retrieves a list of names of all Serverless resources monitored by Prisma Cloud Compute.

_**Note:**_ The query parameters `issueType` is not supported for this API endpoint.

The following curl command uses basic auth to retrieve a list of names of all Serverless resources monitored by Prisma Cloud Compute:

```bash
$ curl -k \
  -X GET \
  -H "Content-Type: application/json" \
  -u <USER> \
  http://<CONSOLE>/api/v<VERSION>/serverless/names \
```
