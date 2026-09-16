# Confirmed purchases in GA4

Web stream: Kintsugi, `G-7ZDB3JLFTP`. The frontend has this public measurement ID
as its build default; no API secret may be placed in NEXT_PUBLIC variables.

## Server configuration

Set `GA4_MEASUREMENT_ID=G-7ZDB3JLFTP` and `GA4_API_SECRET` in the production
backend environment and restart the server. Create the secret in GA4 > Admin >
Data streams > Kintsugi > Measurement Protocol API secrets. Never commit it or
print it to logs. Without it, purchase delivery is paused and logs one warning
at startup; payment processing still works.

## Behavior

The checkout captures the existing GA4 client/session IDs, with a bounded wait.
Missing or blocked IDs do not prevent ordering and are not replaced with invented
IDs. Only these validated fields are stored from client analytics input.
No customer name, phone, email or delivery address is sent to Google.

`order_submitted` means an order was placed. `purchase` is sent only by the server:
card payments after a verified Monobank success callback or admin status sync;
cash orders after an administrator marks the order completed. Staff must use
completed for received/paid orders, not simply dispatched orders.
Old orders without analytics context are not backfilled.

Confirmation time is persisted once. A worker runs every minute with atomic
leases, retry backoff and a sent marker. It sends saved order totals and final
discounted item prices in UAH. Every retry uses the same client_id, transaction_id
and timestamp. The database prevents normal duplicates; GA4 transaction-ID
deduplication covers ambiguous delivery followed by retry. Absolute exactly-once
network delivery is not possible. Google HTTP 2xx acknowledges receipt, not report
validation; use the Measurement Protocol debug validator for payload testing.

Events older than 72 hours are marked expired rather than moved to today's date.
Invalid payloads are marked invalid_payload. Check analyticsDeliveryStatus,
analyticsAttempts and analyticsSentAt for operational verification.
GA4 session attribution has time limits; delayed cash receipts may not attach to
the original session. Refund events are not implemented by this change.

## Confirmed orders for advertising

New orders created after this change have `orderConfirmationEnabled: true`.
An admin moving a COD order to `processing` confirms it for fulfilment; the UI
labels this state "Підтверджено / в обробці". Moving directly to sent, shipped or
completed also confirms it. Card orders qualify only after verified payment success.
`order_confirmed` carries the authoritative order value in UAH, not paid revenue.
`purchase` retains its existing meaning: paid card order or completed COD order.
Never use both as primary bidding goals: import order_confirmed as the primary
order goal in Ads and keep purchase secondary for observing paid revenue.

The separate orderConfirmedAt/orderAnalytics* outbox preserves the first milestone,
leases, retries and the sent marker independently of the existing purchase outbox.
Canceled orders are excluded before claiming. A cancellation after delivery does
not retract an already reported confirmation; it remains a historical confirmation,
not a fulfilled sale. Custom events do not have the documented purchase transaction
deduplication guarantee: ambiguous network timeouts can still cause duplicates,
despite stable event_id, transaction_id and timestamps. No exactly-once claim is made.
Old orders are not enrolled or assigned a new confirmation time by deployment.
GA4 session attribution is time limited: confirm promptly; never manufacture a
fresh session or backdate delayed confirmation to checkout time.

## Validation

`npm test` uses fake transports; it never sends test purchases to production.
Verify page_view/view_item/add_to_cart/begin_checkout in GA4 Realtime on the live
site. Validate purchase payloads with `/debug/mp/collect`; it does not collect
events. Confirm the first real paid order has analyticsSentAt and appears in GA4;
allow Google report processing time. Do not create fake production purchases.

Official references:
- https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events
- https://support.google.com/analytics/answer/12313109
