# Metrics Reference

Counters such as `Questions`, `Queries`, `Bytes_received`, `Bytes_sent`, `Com_select`, and InnoDB row counters are cumulative. They must be converted into rates by:

```text
rate = (current_counter - previous_counter) / elapsed_seconds
```

No rate is emitted when:

- the current snapshot is the first snapshot
- the previous snapshot is missing
- elapsed time is zero or negative
- the counter decreases
- server uptime indicates a restart
- the collection gap is too large

Phase 1 implements shared tests for counter rates, restart handling, buffer pool hit ratio, percentages, and storage growth rate.

Phase 2 collector calculations persist:

- `questions_per_second`
- `queries_per_second`
- `bytes_received_per_second`
- `bytes_sent_per_second`
- `buffer_pool_hit_ratio`

The collector uses a maximum five-minute gap for high-frequency counter-rate calculations. Longer gaps persist the cumulative counter values but leave the derived rate empty.
