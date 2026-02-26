## Packages
zustand | Global state management for the POS cart
date-fns | Formatting dates and calculating elapsed time for KDS timers
lucide-react | Icons for the UI

## Notes
- WebSocket connects to /ws path for real-time updates (order_updated, item_status_changed, table_status_changed)
- Assumes dark mode is the primary/default theme as requested
- Zustand handles complex nested state for variants and modifiers in the cart
