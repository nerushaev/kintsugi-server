# Prom stock feed

The server exposes a read-only XLSX feed for Prom at:

```text
GET /api/products/feeds/prom-stock.xlsx?token=<PROM_STOCK_FEED_TOKEN>
```

For stock-only synchronization without an XLSX template, use the dynamic
barcode feed:

```text
GET /api/products/feeds/prom-stock-by-barcode.xlsx?token=<PROM_STOCK_FEED_TOKEN>
```

The endpoint defaults to the current experimental allowlist:

```text
GET /api/products/feeds/prom-stock-by-barcode.xlsx?token=<token>&scope=test
```

After the barcode-only matching test is confirmed in Prom, the complete
catalog can be requested explicitly:

```text
GET /api/products/feeds/prom-stock-by-barcode.xlsx?token=<token>&scope=all
```

It contains only `Код_товару`, `Наявність` and `Кількість`. MongoDB `barcode`
is written to `Код_товару`; product `amount` and modification `size_left` are
written to `Кількість`. The feed intentionally contains no title, description,
price, image or category and is not intended to create product cards.

Required environment variable:

```text
PROM_STOCK_FEED_TOKEN=<long-random-secret>
```

Optional template override:

```text
PROM_STOCK_TEMPLATE_PATH=/absolute/path/to/stock-template.xlsx
```

By default the endpoint uses `data/prom/stock-template.xlsx`. The current
template contains only the initial 12 test positions. Replace it with a fresh
full Prom export before enabling the feed for the complete catalog.

Only the `Наявність` and `Кількість` columns are changed. Product stock comes
from `amount`; modification stock comes from `modifications[].size_left`.
Rows whose barcode is absent from MongoDB receive zero stock. A duplicate
barcode aborts the feed instead of producing an ambiguous update.
