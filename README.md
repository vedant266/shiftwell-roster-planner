# Shiftwell — W2 hotel roster planner

A small, browser-only prototype for the W2 hackathon topic: inefficient hotel staff scheduling.

## Run it

Open `index.html` in a modern browser. No install, build step, server, or account is required.

## Demo features

- Generate a Monday–Sunday staff roster from hotel occupancy, role skills, weekly days off, maximum hours, and an 11-hour rest interval.
- Show coverage, open positions, planned hours, overtime, and a simple workload-balance indicator.
- Adjust daily occupancy forecasts and regenerate the roster.
- Add staff with a primary role, cross-training skills, weekly hour limit, and day off.
- Preview a weekly team update or a daily shift message for any day in the displayed week. Copying is local; the demo does not send notifications.
- Switch between compact week and list views.

## Scheduling approach

The prototype uses a transparent greedy assignment heuristic. It prioritizes roles with fewer qualified staff, then considers occupancy, current assigned hours, and whether a staff member's primary role matches the position. It enforces the demo's availability, weekly-hour, one-shift-per-day, and minimum-rest rules while assigning.

This is a hackathon starter, not a production scheduler. Occupancy-to-staffing ratios are illustrative defaults, the fairness number is a simple workload-balance indicator, and the rest rule is a configurable demo assumption rather than jurisdiction-specific legal advice. Real deployments should configure local labor rules, hotel-specific demand, employee preferences, and notification delivery.
