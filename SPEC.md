Here’s a clean, buildable design spec focused on your goals: no installs, fast onboarding, and meaningful student experimentation.

⸻

Hand Playground

Electron + MediaPipe Gesture Interaction App

⸻

Purpose

Enable students to:

* See real-time hand tracking
* Capture hand poses
* Assign behaviors to poses
* Prototype interactive systems without coding

No external installs. Runs as a packaged desktop app.

⸻

System Overview

Webcam
  ↓
MediaPipe Hand Landmarker
  ↓
Landmark Stream (21 points per hand)
  ↓
Gesture Engine
  ↓
Action Engine
  ↓
UI Feedback + Outputs (sound, visuals, events)

⸻

Tech Stack

Layer	Choice	Reason
Desktop	Electron	Single distributable app
UI	React	Fast iteration, component-based
ML	MediaPipe Tasks Vision	Runs locally, no Python
State	Zustand or simple store	Lightweight
Audio	Web Audio API	No dependencies
Storage	JSON (local filesystem)	Portable student projects

⸻

Core Modules

1. Camera + Tracking Module

Responsibility

* Initialize webcam
* Run MediaPipe Hand Landmarker
* Output normalized landmark data

Output

{
  hands: [
    {
      handedness: "Left",
      landmarks: [{x, y, z}, ... 21]
    }
  ]
}

⸻

2. Visualization Layer

Displays

* Camera feed
* Hand skeleton overlay
* Landmark points

Modes

* Normal
* Debug (shows landmark indices + values)

⸻

3. Gesture Capture System

User Flow

Click "Capture Pose"
→ Freeze current frame
→ Enter name
→ Save

Stored Data

{
  id,
  name,
  handedness,
  landmarks,
  threshold
}

Key Constraints

* Capture one hand at a time (v1)
* Normalize relative to wrist position

⸻

4. Gesture Matching Engine

Input

* Live landmarks
* Saved gesture library

Process

* Compare current hand to each saved pose
* Compute similarity score

Core Method

* Euclidean distance across all 21 points

Output

{
  gestureId,
  score,
  matched: true/false
}

Adjustable

* Threshold per gesture
* Global smoothing (optional)

⸻

5. Action System

Purpose
Map gestures → behaviors

Action Types (v1)

Action	Description
Play Sound	Trigger audio file
Change Color	Background/UI color
Show Image	Overlay image
Trigger Animation	UI animation
Keyboard Event	Send keypress
Send Message	JSON event (future: MQTT/OSC)

Action Schema

{
  type: "playSound",
  params: {
    file: "bell.wav"
  }
}

⸻

6. Runtime Engine

Loop

Every frame:
  → get landmarks
  → run matcher
  → if match:
       trigger action (debounced)

Debounce Logic

* Prevent rapid retriggering
* Example: 500ms cooldown per gesture

⸻

7. Project System

Storage
Local JSON file

/projects/
  project1.json
  project2.json

Project Structure

{
  gestures: [...],
  actions: [...],
  settings: {
    cameraId,
    mirror,
    sensitivity
  }
}

Capabilities

* Save
* Load
* Export (share with classmates)

⸻

UI Design

Layout

+--------------------------------------+
| Toolbar                              |
| [Camera] [Capture] [Test Mode]       |
+--------------------------------------+
|                                      |
|      Camera + Hand Overlay           |
|                                      |
+-------------------+------------------+
| Gesture Library   | Action Panel     |
|                   |                  |
| - Pinch           | Action: Sound    |
| - Open Hand       | File: bell.wav   |
| - Fist            |                  |
+-------------------+------------------+

⸻

Key UI States

1. Setup Mode

* Camera selection
* Toggle mirror
* Tracking visible

2. Capture Mode

* Freeze frame
* Save gesture

3. Assign Mode

* Select gesture
* Choose action

4. Test Mode

* Live matching
* Feedback on trigger

⸻

Interaction Model

Basic Flow

1. Open app
2. Turn on camera
3. Make hand shape
4. Click "Capture"
5. Name it ("Fist")
6. Assign action ("Play Sound")
7. Enter Test Mode
8. Make gesture → sound plays

⸻

Performance Requirements

* ≥ 24 FPS tracking
* < 50ms gesture evaluation
* Works on standard student laptops

⸻

Packaging

Use Electron Builder:

npm run build

Outputs:

* macOS .dmg
* Windows .exe

Include:

* MediaPipe model file (.task)
* All assets bundled

No internet required.

⸻

Extension Path (Future)

Gesture Improvements

* Relative joint angles instead of raw positions
* Multi-frame gesture detection (movement)

Multi-Hand Support

* Two-hand gestures
* Interaction between hands

System Integration

* MQTT (fits your current work)
* OSC output
* WebSocket bridge

Teaching Mode

* Show landmark values live
* Export gesture data
* Visualize similarity score

⸻

Key Design Principles

* Immediate feedback (students see cause/effect instantly)
* No setup friction
* Gesture = example, not training
* Actions feel tangible (sound, visuals, events)
* System is inspectable (not a black box)

⸻

If you want next step, I can:

* scaffold the repo structure
* give you a minimal working Electron + MediaPipe starter
* or design this as a 2–3 week class assignment with milestones