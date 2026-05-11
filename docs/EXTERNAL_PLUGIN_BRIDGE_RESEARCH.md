# External Plugin Bridge Research

## Objective

Define a non-blocking architecture for future VST/AU hosting through a desktop companion while preserving the current web-native plugin model.

## Proposed Topology

- **Browser App (RIDDIM):** continues to run internal plugins and sequencing.
- **Bridge Daemon (Desktop):** hosts external plugins in isolated process pools.
- **IPC Layer:** WebSocket control channel + binary audio/control frames.
- **Sync Source:** browser transport clock remains authoritative; bridge follows via tick sync packets.

## Protocol Draft

### Session Handshake
1. Browser sends `hello` with app version and supported protocol versions.
2. Bridge replies with capabilities (`vst3`, `au`, sample rates, block sizes).
3. Browser selects profile and receives `sessionId`.

### Control Messages
- `plugin.load`
- `plugin.unload`
- `plugin.param.set`
- `plugin.preset.apply`
- `plugin.chain.order`
- `transport.sync`

### Streaming Messages
- `audio.input.frame` (optional sidechain/send bus)
- `audio.output.frame`
- `meter.frame`

## Latency Model

- Target roundtrip control latency: < 20ms.
- Target render quantum: 128-256 samples.
- Drift correction: transport sync every bar plus phase correction every 16th note.

## Security Boundaries

- Plugin hosting sandboxed per chain/process.
- No arbitrary file access from browser-initiated requests.
- Signed command envelope with nonce to avoid replay.

## Internal Compatibility Requirements

To stay bridge-ready, internal types should keep:
- stable `DeviceChain` descriptors
- deterministic plugin parameter IDs
- transport-timestamped modulation/control events

## Phase Proposal

1. **P0:** protocol emulator (no real VST/AU), verify app messaging contracts.
2. **P1:** desktop bridge with one hosted external effect.
3. **P2:** hosted instrument + preset roundtrip + chain rendering.
