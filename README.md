# Files
[files.neko03.moe](#)

A simplified file storage, which is able to use purely in shell, and easy to use in programs.
- Storage: Cloudflare R2.
- Authorization: TOTP (Time-based One-Time Password), customized secret.
---
### Docs

Register a volume (storage account) on files.neko03.moe.
```sh
# Register a volume (storage account) on files.
# <Volume-Name>  : Username.
# <Volume-Object>: Volume configurations.
curl -X POST 'https://files.neko03.moe/<Volume-Name>' -d '<Volume-Object>'
```

Volume Properties object:
```typescript
type Volume = {
    // Operations to grant to public.
    no_auth: ('get' | 'put' | 'delete')[] | null,
    // Secret (password) for volume.
    secret: string,
}
```

About authorization, TOTP is recommanded: base32 encode your secret and manually input in Managers like Microsoft Authenticator.
```sh
# <Endpoint>: Endpoints that need authorization.
# <TOTP>    : Time-based One-Time Password.
curl '<Endpoint>' -H 'Authorization: TOTP <TOTP>'
```

But Secret is also useable.
```sh
curl '<Endpoint>' -H 'Authorization: Secret <Secret>'
```

Manage the volume.
```sh
# Check volume properties.
curl 'https://files.neko03.moe/<Volume Name>' -H ...

# Update volume properties (JSON Merge patch).
curl -X PATCH 'https://files.neko03.moe/<Volume Name>' -H ... -d '{...(Subset of Volume Properties to update.)}'

# Delete volume.
curl -X DELETE 'https://files.neko03.moe/<Volume Name>' -H ...
```

Use the volume (CRUD):
```sh
# List files in storage account.
curl 'https://files.neko03.moe/<Volume Name>?list=true' -H ...

# Get a file.
curl -O 'https://files.neko03.moe/<Volume Name>/<Filename>' -H ...

# Put (upload or overwrite) a file.
curl -X PUT 'https://files.neko03.moe/<Volume Name>/<Filename>' -H ... --data-binary @'<Filepath>'

# Delete a file.
curl -X DELETE 'https://files.neko03.moe/<Volume Name>/<Filename>' -H ...
```
