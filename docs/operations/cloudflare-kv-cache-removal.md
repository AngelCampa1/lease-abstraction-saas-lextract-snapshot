# Cloudflare KV cache removal runbook

## Scope

This runbook covers the safe deployment of the frontend change that removes Cloudflare KV-backed Next.js cache usage, plus the one-time cleanup of the stale Lextract KV namespaces after deploy.

## What changed

The frontend no longer binds or uses Cloudflare KV for the OpenNext incremental cache.

Runtime behavior now is:
- static and prerendered content uses `static-assets-incremental-cache`
- `enableCacheInterception` is enabled
- there is no tag cache binding
- there are no `NEXT_INC_CACHE_KV` or `NEXT_TAG_CACHE_KV` bindings in `wrangler.jsonc`

## Runtime revalidation review

The frontend was reviewed for custom runtime revalidation hooks before this cutover.

What was checked:
- no `revalidateTag` usage
- no `revalidatePath` usage
- no `unstable_cache` usage
- no route-level `export const revalidate` usage

Practical result:
- this app is safe to run without KV-backed Next cache for the current feature set
- content freshness for marketing and resource content is now deploy-driven
- authenticated app routes still render dynamically on demand where needed

If someone later introduces runtime revalidation, they must make an explicit storage decision first instead of reintroducing KV by default.

## Safe deployment sequence

### 1. Deploy from the frontend directory

```powershell
cd <repo-root>\frontend
npm run build:cf
npm run deploy:cf
```

Notes:
- `build:cf` runs the OpenNext Cloudflare build path used by this repo.
- `deploy:cf` uses `opennextjs-cloudflare deploy`.

### 2. Confirm the active Worker no longer has KV bindings

Use either the dashboard or Wrangler-backed inspection.

Dashboard path:
1. Open Workers and Pages.
2. Select the `lextract` Worker.
3. Open `Settings > Bindings`.
4. Confirm there is no KV binding named `NEXT_INC_CACHE_KV`.
5. Confirm there is no KV binding named `NEXT_TAG_CACHE_KV`.

Expected state:
- no KV bindings for the Next cache
- static assets deployment still present
- service bindings unrelated to KV remain unchanged

### 3. Verify the deploy is healthy

Smoke-check the public routes after deploy:
- `/`
- `/pricing`
- `/resources`
- `/upload`
- `/login`
- one authenticated route such as `/dashboard` if you have a live session

Expected behavior:
- marketing pages load normally
- dynamic authenticated routes still render
- no runtime errors complaining about missing KV bindings

## One-time KV cleanup

Do this only after the new deployment is live and confirmed healthy.

### List KV namespaces

```powershell
cd <repo-root>\frontend
npx wrangler kv namespace list
```

Look for these namespaces:
- `lextract-inc-cache`
- `lextract-tag-cache`

### Delete the stale namespaces

Prefer deleting by namespace ID returned from the list command.

```powershell
npx wrangler kv namespace delete --namespace-id <LEXTRACT_INC_CACHE_ID> --y
npx wrangler kv namespace delete --namespace-id <LEXTRACT_TAG_CACHE_ID> --y
```

Rules:
- delete the namespaces only once the new deployment is live
- do not delete them before verifying the active Worker has no KV cache bindings
- if the active Worker still shows either cache binding, stop and investigate instead of deleting anything

### Dashboard alternative

If you prefer the dashboard:
1. Open `Workers KV`.
2. Search for each namespace by name.
3. Open the namespace.
4. Delete it.
5. Repeat for the remaining stale namespace.

## Post-deploy validation

After cleanup, verify:
- the active Worker still has no KV cache bindings
- `npx wrangler kv namespace list` no longer shows the deleted namespaces
- the site still loads normally

Billing expectation:
- the old KV storage charge is historical and will not disappear retroactively
- the goal is to stop new KV storage accumulation going forward
- current-period KV storage should stop growing after this cutover and cleanup

## Rollback

If the deploy reveals a real runtime dependency that was missed:
1. Roll back to the previous Worker deployment from the Cloudflare Deployments tab.
2. Do not recreate KV blindly.
3. Reassess whether the dependency is real runtime revalidation or a separate issue.
4. If runtime cache is actually required later, evaluate an intentional replacement instead of KV by default.
