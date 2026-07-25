# FAB Trades

A trade companion for Flesh and Blood TCG players: price lookup, trade
balancing, want lists, and card scanning. Web app plus Flutter mobile app
sharing one Supabase catalog.

## Language

**Binder**:
The cards a player is willing to trade away right now — their tradeable
stock. Putting a card in the Binder is the act of marking it for trade.
There is no owned-but-not-tradeable concept: deck cards and shoebox bulk
do not exist in the app.
_Avoid_: Collection, inventory, owned cards

**Want List**:
Cards a player is looking to acquire. Shown to other players as a visual
grid so they can check their binder against it.

**Trade Filler**:
A suggested card whose price closes the value gap of a live trade. The
side that owes value determines whose cards are relevant: my side needs
value → my Binder; their side needs value → my Want List.

**Confirm Trade**:
The single action that executes a live trade: it is recorded to history
and the Binder updates to match — given cards leave, received cards
enter (each skippable, but on by default). A cleared trade touches
nothing.
_Avoid_: Save trade

**Printing**:
A specific physical version of a card (set + finish), keyed by
`<product_id>-<subtype>`. Binder and trade entries reference printings,
not card names.

**Condition**:
Physical wear grade of a Binder entry (NM, LP, MP, HP, DMG). Descriptive
only — the app does not price-adjust by condition.
