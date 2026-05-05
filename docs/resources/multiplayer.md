# Multiplayer

Online multiplayer is achievable in our browser-only constraint, but it requires understanding what costs money, what is free, and where the trade-offs sit.

## The fundamental problem

WebRTC is a browser-native API for peer-to-peer connections. Browsers can connect directly to each other and exchange real-time data without a relay server. The catch: to start a connection, the two browsers must exchange "signaling" data (SDP offers, answers, ICE candidates). They cannot do this directly because they do not yet know how to reach each other. They need a third party to relay this initial handshake.

Once the handshake is done, gameplay traffic flows peer-to-peer with no middleman.

Multiplayer in our setup therefore decomposes into:

1. **Signaling**: how two clients find each other and exchange handshake data. Requires a server, but the load is tiny (one short exchange per connection).
2. **STUN**: figuring out each client's public IP/port. Free public STUN servers exist (Google, Cloudflare).
3. **TURN**: relaying traffic when direct P2P fails (about 10 to 20 percent of cases due to symmetric NATs and corporate firewalls). TURN servers are bandwidth-heavy and usually cost money.
4. **Game logic synchronization**: deciding who is authoritative, how to handle latency, how to handle disagreement.

For a hobby project, items 1 to 3 are the technical hurdles. Item 4 is engineering work in our own codebase regardless of which library we pick.

## Recommended option: PeerJS with the public broker

- **What you get**: A single line of JS connects to PeerJS's free cloud signaling broker. Each peer chooses or is assigned a short ID. Peers find each other by ID. Once connected, data channels carry game traffic peer-to-peer.
- **What it costs**: Zero for hobby use.
- **Reliability**: Generally good. The public broker occasionally has outages. For a hobby project, acceptable.
- **License**: MIT.

Minimum example for a host/client setup:

```js
// On host
const peer = new Peer('cool-room-code');
peer.on('connection', conn => {
  conn.on('data', data => { /* receive client input */ });
  conn.send('hello'); // server response
});

// On client
const peer = new Peer();
const conn = peer.connect('cool-room-code');
conn.on('open', () => conn.send('hello from client'));
conn.on('data', data => { /* receive server state */ });
```

The "room code" is just a string. If both peers know it, they connect.

## Alternative: NetplayJS

- **URL**: https://github.com/rameshvarun/netplayjs
- **What it adds over PeerJS**: A full game framework with rollback netcode (the technique fighting games use to hide latency). You implement game logic in a deterministic update loop, NetplayJS handles the rest.
- **Trade-off**: Less flexible than PeerJS for non-game data flows. Best for games where every frame should feel responsive.
- **Public matchmaking server**: NetplayJS provides one for free.
- **Caveat**: Smaller user base than PeerJS, less long-term assurance.

## Alternative: simple-peer with manual signaling

- **URL**: https://github.com/feross/simple-peer
- **What it adds**: No third-party broker at all. Two peers exchange signaling tokens via copy-paste (via Discord, email, or any out-of-band channel).
- **Trade-off**: Awkward UX. Players must copy a string from one to the other to start.
- **When to use**: Maximum independence from any third-party service, including the PeerJS broker.

## TURN: when peers can't connect directly

If both peers are behind restrictive NATs or corporate firewalls, direct P2P fails and a TURN server must relay traffic. Free public TURN servers exist but are unreliable and rate-limited. Reliable TURN costs money.

Options for hobby use:

- **Open Relay TURN** (https://www.metered.ca/tools/openrelay/) is a free public TURN with rate limits. Good enough for testing, not for shipping.
- **Self-hosted TURN with coturn** is possible but defeats the purpose of staying browser-only.
- **Skip TURN entirely** for hobby games. Many will accept that some connections fail and ask players to try a different network.

## Corporate-firewall caveat

Online multiplayer typically does not work from a locked-down corporate network. WebRTC traffic, public STUN/TURN endpoints, and signaling brokers are commonly blocked at corporate egress. The realistic use case is "play with a friend from home" rather than "play during work breaks." Plan accordingly: develop multiplayer features expecting they will be tested on a home network.

## Architecture patterns

When we add multiplayer to the engine, three high-level patterns to choose from:

### Lockstep (deterministic)

All clients run the same simulation. Clients send only inputs. The simulation must be perfectly deterministic. NetplayJS does this with rollback for responsiveness.

- **Best for**: Fighting games, real-time strategy with limited objects, deterministic simulations.
- **Hard part**: Floating-point determinism is fragile. Avoid `Math.random` without a seeded PRNG, avoid timing-dependent code, avoid iteration over object property orders that browsers might disagree on.

### Authoritative server (one peer is the server)

One peer simulates the world and broadcasts state. Others send inputs and render the broadcast.

- **Best for**: Action games where one player can host. The host has a slight latency advantage but it's usually fine.
- **Hard part**: Handling host disconnect (the game ends or migrates).

### State sync (eventual consistency)

Each peer simulates locally, periodically reconciling with peers.

- **Best for**: Co-op games where divergence is tolerable (different players in different rooms).
- **Hard part**: Reconciliation logic, especially around player-affecting events.

For our framework's first multiplayer game, the **authoritative-server** pattern is the most pragmatic: simplest to implement, reasonably robust, does not require deterministic simulation.

## Open questions for a future ADR

When multiplayer is added to the engine itself, decisions to make:

- Does the engine bake in PeerJS, or is networking a per-game choice?
- Is there a base class (`MultiplayerScene`?) that abstracts the networking model so games can swap implementations?
- How does the SignalBus interact with network events? One reasonable design: network messages are dispatched as signals automatically, so game code listens for `network_event_x` the same way it listens for any other signal.
- How is room creation surfaced to the player UX? A separate scene, or a modal overlay?

These are intentionally not designed yet. We will ADR them when the first multiplayer game is on the docket and we have a concrete game's requirements driving the design.
