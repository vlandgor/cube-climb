# Cube Climb — Gameplay Design Document

**Version 0.2 — 10 Nov 2026**
Status: Playable prototype. Core movement, input and generation validated.
Genre: 2D endless climbing platformer.
Inspiration: Doodle Jump, Only Up!

---

## 1. Overview

A 2D endless climbing platformer. The player controls a cube that jumps between platforms arranged on an ascending grid. The objective is to climb as high as possible without falling too far.

The game is fast paced. Jumps are short, inputs are instant, and the player is airborne most of the time.

The primary performance metric is the maximum height reached, measured in steps.

## 2. Platform Structure

All platforms sit on a fixed grid:

- Horizontal spacing between neighbours is constant.
- Vertical spacing between neighbours is constant.
- Every platform is one diagonal step from its neighbours.

Platforms are generated in **segments** of 5–10 platforms. Each segment ascends in one direction, left or right. At the end of a segment the path either reverses direction or **forks**.

### 2.1 Forking

At a segment boundary there is a chance (default 45%) the path splits into two branches — one ascending left, one ascending right. Both branches are real, climbable paths. This is what makes the climb a series of choices rather than a single line.

- Up to 3 branches may exist at once.
- Branches grow independently and may later merge if they meet on the same grid cell.
- A branch that is still reachable always keeps growing, so **no branch can dead-end**. A fork is a choice of route, never a trap.

### 2.2 Branch Separation

Branches are not allowed to grow on top of each other. Before placing a platform, a branch checks whether another branch already occupies that column within 2 rows; if so it turns away instead.

A branch is exempt from this check against its own recent platforms, because a normal direction reversal always doubles the path back two rows above itself. Without the exemption no segment could ever change direction.

This keeps the structure readable and prevents accidental connections between unrelated branches.

## 3. Controls

**Four buttons, one per diagonal: ↖ ↗ ↙ ↘**

Each button is an explicit, unambiguous intent. There are no modifiers and no direction state to track.

- Up-left / up-right: climb one step.
- Down-left / down-right: drop one step, for recovery and route changes.

A button is dimmed when no platform exists that way.

### 3.1 Why not two buttons

A two-button scheme (left / right, meaning "horizontal direction") is ambiguous at every fork and at every direction reversal, where both an up and a down platform exist on the same side. Resolving that needs a modifier — holding the opposite button — and holding a button cannot be made safe under instant press-firing, because at a reversal the opposite side is empty and pressing it throws the player into the void.

The alternative, firing on release, makes holding safe but adds the hold duration as latency to every single jump. That is unacceptable in a fast game.

Four buttons remove the ambiguity, so every press can fire instantly. The two-button scheme is retained in the prototype as a toggle for comparison.

### 3.2 Input Rules

- **Jumps fire on button press**, with no delay.
- **Input buffering (140 ms):** a press made while airborne is queued and fires the instant the player lands. The player can play ahead of the game instead of waiting to land.
- **Taps into empty space are ignored.** The cube shakes and the player keeps their footing. A mistimed tap costs nothing.

## 4. Movement

Jump arcs are computed from the grid, not hand-tuned, so they stay correct when spacing changes.

- **Climb:** an arc whose apex clears the step height, landing exactly one step up and across.
- **Drop:** a shorter hop landing one step down and across.
- On landing the cube snaps to the platform centre, keeping the lattice clean over long runs.
- The player cannot steer while airborne. The jump is committed at the moment of input.

## 5. Falling and Recovery

Falling does not mean immediate failure. Because the structure doubles back over itself, a falling player lands on platforms below — often ones they have already visited.

- The player falls with gravity and lands on any platform they cross from above.
- **Death line:** the run ends if the player falls more than 12 steps below their best height. The line rises as the player climbs and never falls.
- Visited platforms are marked, so the recovery surface below is readable.

Descending deliberately is a legitimate move — it is how the player changes route after taking a fork that drifted the wrong way.

## 6. Camera

- Follows the player vertically, holding them low in frame so the climb ahead is visible.
- Follows horizontally, since forking makes the structure drift sideways.
- **Leads downward during a fall**, proportional to fall speed, so the player can see where they are about to land.

## 7. Resolved Design Questions

1. **Jump trigger** — Player input, every jump, firing on press. Auto-jump exists as a prototype toggle but removes the core decision.
2. **Air control** — No. The jump is committed on input; buffering covers responsiveness instead.
3. **Branching** — Yes. The structure is a graph with forks and merges, not a single path.
4. **Falling** — The player may land on any platform below, from any branch.
6. **Camera** — Follows both axes, player held low, leads downward on falls.
7. **Failure** — 12 steps below best height.

## 8. Open Questions

1. **Are forks meaningful?** Both branches are currently equally viable and look identical from the junction. A choice with no visible difference is a coin flip. Branches likely need a readable trade-off — a steeper but shorter line versus a safer, longer one.
2. **Difficulty progression.** Nothing currently changes with height. Candidates: wider spacing, shorter platforms, more frequent forks, a rising death line.
3. **Fall tolerance.** 12 steps is a guess. It sets how punishing a mistake is and how much the recovery mechanic actually gets used.
4. **Does the cube need momentum?** Each jump currently starts from rest. Chained jumps in one direction could build speed.

## 9. Prototype Scope

**Implemented:** controllable cube, four-button input, input buffering, grid-based platforms, segmented generation, forking and merging branches, branch separation, dead-end prevention, jump and drop arcs, falling physics, landing on previously visited platforms, death line, height tracking, camera follow with fall look-ahead, live tuning panel.

**Out of scope:** enemies, collectibles, power-ups, platform types, customisation, economy, missions, multiplayer, progression systems.
