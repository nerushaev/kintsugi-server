# Public product images

Poster blocks crawlers in its robots.txt. A browser-readable Poster image can
therefore still be rejected by Merchant Center. Copy original product images to
public Cloudinary `image/upload` assets. Do not edit Poster stock or source fields.

## Local changes and deployment order

Deploy the server (model, feed projection and image selector) and frontend
(gallery, Product JSON-LD and Open Graph). Existing products keep their current
images until a verified copy exists. This deployment alone does not remove
Google's existing image rejection. No upload occurs in a web request or webhook.

Fields `photo_public` and `photo_public_source` store the copy and normalized
source URL. Poster updates use their own explicit fields and preserve these.
If the original source URL changes, the copy is ignored until the background worker
copies the replacement. An image replaced at the exact same source URL cannot be detected by this
mechanism: change/version the source URL before copying a replacement.

## Preview (read-only database access)

Run from the server directory with its existing `.env` / `DB_HOST`:

```sh
npm run products:mirror-images -- --product-id=2311 --limit=1
npm run products:mirror-images -- --limit=1000
```

Without `--apply`, no upload, asset verification or database write is performed.
The database connection disables automatic index and collection creation. Default limit is 5
eligible products; already mirrored products and non-Poster images are skipped.
The query only includes currently visible, in-stock products.

## Pilot (requires separate approval to upload and write production data)

Configure the standard `CLOUDINARY_URL` in the execution environment, using the
existing store account. Do not put credentials in commands, logs or source files.
Check account capacity before approving a bulk transfer.

```sh
npm run products:mirror-images -- --apply --product-id=2311 --limit=1
```

The script uploads sequentially, retrieves the public HTTPS image, then writes
the two fields only if the source and existing mirror fields are unchanged.
Failures leave the database fields untouched and cause a nonzero exit status.
Asset IDs are hashes of source URLs and uploads do not overwrite existing assets,
so retries reuse the same asset. If saving fails, an unused Cloudinary asset may
remain; it is not deleted automatically and the next attempt can reuse it.

Verify the pilot image, `g:image_link` in `/feeds/google.xml`, visible gallery,
Product JSON-LD and Open Graph. Allow for the feed's CDN cache (900 seconds plus
stale-while-revalidate) and Google's subsequent feed processing/recrawl.
Only after the pilot succeeds, approve a bounded bulk run, for example:

```sh
npm run products:mirror-images -- --apply --limit=100
```

## Automatic preparation

The server starts an image worker after connecting to MongoDB, then scans every
five minutes. It processes visible, in-stock website products sequentially using
the same upload, public retrieval and conditional-save logic as the CLI. Completed
copies are skipped. Failures retry on the next scan and do not block later products
or Poster stock synchronization. Scans do not overlap within a server process;
stable Cloudinary IDs and conditional saves also make duplicate attempts safe.
Pending work is derived from persisted product fields and survives restarts.
The production server needs its existing `CLOUDINARY_URL` configuration.

The Google feed never publishes Poster image URLs. Products without a usable
main or extra image wait until their copy is ready. Existing checks still require
a known website category, ID, title, positive price and available stock. The next
feed request includes prepared products automatically; allow for CDN caching and
Merchant Center's daily fetch. Google policy approval is a separate review.
Worker logs report attempted/saved/failed counts and IDs requiring retry, without
SDK error contents or credentials. Additional gallery images are not migrated.

## Rollback

After approval, unset only `photo_public` and `photo_public_source` for affected
product IDs (record the IDs from script output). Original photos and stock are
untouched. Do not remove assets while caches or Merchant Center still use them.
This rollback restores the previous Poster image behavior, including its crawler
restriction. Code rollback is also independent of the new optional fields.

## Offline validation

`npm test` uses mock upload/verification/save functions and never connects to
production services. Frontend: run `npm run typecheck` and
`node --test test/productImages.test.cjs` in the website repository.
