# Prom stock feed

The server exposes a read-only XLSX feed for Prom at:

```text
GET /api/products/feeds/prom-stock.xlsx?token=<PROM_STOCK_FEED_TOKEN>
```

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
