# 3D UI Fusion

Fusion makes the serving district the primary workspace. The world presents the entities and their operating state; conventional controls appear where a player needs to act. The simulation and all mission rules are shared with the existing Tactical interface.

## A spatial interaction loop

An empty hex opens a construction surface tied to that sector. Choosing a module commits the same validated build action as the command dock. The surface becomes a live module inspector with its installed capacity, current lens reading, power demand, upgrade, recycling, and repair actions. Selecting a different sector changes the inspector’s identity and its tether.

The card occupies a stable location on the screen. Its reticle and connector continue to follow the selected 3D entity. Keeping actionable controls stationary is deliberate: a moving request must not turn buttons into targets the player has to chase. A placement helper reserves space for the command dock and camera rail, clamps off-screen anchors, and recomputes the layout when the viewport changes. A ResizeObserver supplies the actual card height, including the fallback layout.

Focusing a module clears the card and eases the camera into the hardware. The player can select the enlarged module again to restore its controls. Riding a request also clears the surface, leaving the world, payload label, and compact tracking status visible. Trace can reopen the inspector during the ride. Inspection itself continues in game time; Pause provides time to read and plan.

The lower command dock offers fast construction tools, playback speed, research, sector access, telemetry, request tracing, and mission control. The rest of the screen uses compact mission and resource summaries. Research and telemetry unfold on demand. A single toggle restores the original Tactical panels while preserving units, requests, credits, clock, and research.

## Live information in the world

| Lens   | Ring and label meaning                                                                                                                                                                  | What it helps reveal                                                   |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Flow   | Prefill occupancy out of one slot; decode occupancy out of its actual batch slots. Handoffs reserve a decode slot. Banks show pooled reserved KV; switches show useful fabric activity. | A busy phase, unused compute, or a decode engine waiting on transfers. |
| Memory | KV reserved by associated live requests as a fraction of the pooled budget. Banks include all reservations and the prefix feature’s fixed reserve.                                      | Admission pressure and the retained state associated with each phase.  |
| Fabric | The fraction of active KV handoffs associated with an engine, multiplied by useful shared line rate. Switches show the entire active useful line rate.                                  | Contention and how multiple transfers share the same fabric.           |

These values come from `moduleTelemetry` and the game state, not a random animation or remote monitoring feed. Source and destination can both be associated with the same handoff; their readings must not be added as separate physical link traffic. Memory readings describe logical game reservations, including future output, rather than measured HBM placement. Useful fabric assumes 70% line-rate efficiency. Transfer animation retains the game’s 45× teaching-time stretch.

The same reading sets a module’s numerical annotation, inspector, ring color, and arc length. Cooling faults override the reading with the remaining outage time and a repair prompt. The large perimeter ring reflects service integrity. Unit geometry, stars, trails, and decorative orbit markings remain illustrative.

## Moving through the district

The scene offers an isometric overview, top-down view, focused module framing, a slow user-selected orbit, and request tracking. Entry and view changes use smooth camera interpolation. The renderer preserves its Three.js scene, geometry, units, packets, and label identities throughout the transitions.

Tracking follows the selected request’s actual position. When that request leaves the live state, the existing request selector chooses the next available request. The camera follows the game’s ingress, prefill, handoff, decode, and delivery positions. This is a visual guide through a symbolic serving district, not a reconstruction of packet-level network paths.

Direct camera gestures release automatic tracking and orbital motion. Overview restores the full district. Cinema mode hides the HUD and annotations while retaining an accessible restore button and pause control. The game clock continues unless the player pauses it.

## Controls and accessibility

| Control              | Action                                                    |
| -------------------- | --------------------------------------------------------- |
| Empty hex            | Open construction for that sector                         |
| Module or its label  | Inspect and operate the module                            |
| Request or Trace     | Inspect a live request                                    |
| Drag / pinch / wheel | Orbit and zoom                                            |
| 1–4                  | Arm a construction tool                                   |
| Space                | Pause or resume when focus is outside a button            |
| Q / E                | Rotate the camera                                         |
| R                    | Return to overview                                        |
| U                    | Upgrade the selected module                               |
| H                    | Hide or restore the immersive HUD                         |
| L                    | Hide or restore world annotations                         |
| F                    | Start or stop riding a live request                       |
| Escape               | Dismiss the current surface or tool, then mission control |

Projected buttons use the same entity identities as their 3D counterparts. Hidden or off-screen annotations also leave the accessibility tree and tab order. The sector drawer retains sixteen labeled controls even when world labels are hidden. Spatial cards are nonmodal regions; full-screen mission and help dialogs retain native focus trapping.

On phones, the dock becomes two rows, surfaces use a centered sheet, and the layout reserves room above the dock. Annotations, controls, numerical values, and text supplement color. Reduced-motion preferences disable background orbit, ambient rotation, transitions, and interpolated camera flights. Explicit request tracking remains available; Pause freezes meaningful request movement and deadlines.

If WebGL is unavailable or lost, the tactical grid and the same action controls keep the game playable. Fallback cards still use measured dimensions and viewport bounds. No renderer is recreated behind the fallback when switching between Learning mode and the game.

## Implementation and verification

- `FusionUI.tsx` owns progressive disclosure, command surfaces, contextual actions, and the accessible sector and telemetry drawers.
- `fusion.ts` maps simulation state to lens readings and handles bounded, pinned surface placement.
- `Game.tsx` connects those actions to the existing reducer and preserves the service across interfaces.
- `GameScene.tsx` projects entity labels and forwards world anchors without rendering React on every animation frame.
- `scene.ts` keeps camera interpolation, tracking, raycasting, ring geometry, instanced packets, and traces in the persistent Three.js runtime.

No additional runtime dependencies, external assets, accounts, or services are required. Arc length uses geometry draw ranges; labels and tethers update in the rendering loop. Adaptive pixel ratio reduces rendering cost on slow devices without altering the game’s economy or model. Inactive scenes stop rendering, hidden tabs stop simulation time, and resource cleanup covers the added geometry and materials.

Pure tests cover viewport extremes and stationary controls during payload movement, alongside reservations, slots, bandwidth shares, and fault reporting. Browser tests cover the default interface through construction and victory, camera continuity and tracking, actual moving-button stability, mobile bounds, research and interface round trips, reduced motion, and the no-WebGL path.
