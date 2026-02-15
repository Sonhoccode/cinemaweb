# PLAN-room-fix-consolidate

> **Goal**: Consolidate fixes, remove unused code, and ensure robust Room functionality.

## 1. Context & Objectives

- **Current State**: Initial critical bugs (crash, import error, sync loop, auto-join) have been resolved.
- **Objective**: Perform a cleanup pass to remove dead code, verify backend host persistence, and polish the user experience.

## 2. Analysis & Hypotheses (Debug Mode)

### H1: Unused State variables in Room.jsx

- **Observation**: `showMovieSelector` and `handleMovieSelect` seem disconnected from the UI.
- **Action**: Clean up unused code or implement the missing UI if intended.

### H2: Socket Event Handling Robustness

- **Observation**: `socket.js` handles `join-room`, `player-state`. Need to verify if `disconnect` logic correctly handles "Host Migration" if host disconnects abruptly.
- **Action**: Review `server/config/socket.js`.

### H3: UX Polish

- **Observation**: Mobile layout during fullscreen needs to be seamless.
- **Action**: Verify Chat/Member toggle visibility during fullscreen.

## 3. Implementation Tasks

### Task 1: Clean Up Room.jsx

- [ ] Remove unused `showMovieSelector` if not used.
- [ ] Consolidate `useEffect` dependencies.
- [ ] Add comments for complex Sync logic.

### Task 2: Verify Backend Socket Logic

- [ ] Read `server/config/socket.js`.
- [ ] Ensure `disconnect` event properly reassigns host if needed.
- [ ] Ensure `player-state` is broadcast correctly to all _except sender_.

### Task 3: Final UI Verification

- [ ] Verify `Loading` states are consistent.
- [ ] Verify `Error` handling (e.g. invalid Room ID).

## 4. Execution Plan

1.  Read `server/config/socket.js`.
2.  Refactor `Room.jsx` (Cleanup & Commenting).
3.  Notify User of completion.
