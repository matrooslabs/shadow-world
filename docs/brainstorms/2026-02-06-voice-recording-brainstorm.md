# Voice Recording for ElevenLabs Voice Cloning

**Date:** 2026-02-06
**Status:** Ready for planning

## What We're Building

A voice recording feature inside the AddKnowledgeModal that allows substrate owners to record ~2 minutes of continuous audio. The recording is uploaded to the Python backend and stored locally, to be used as training data for ElevenLabs Instant Voice Cloning.

## Why This Approach

- **Single continuous recording** — ElevenLabs Instant Voice Cloning only needs ~2 minutes of audio, so a single session is sufficient. No need for multi-clip complexity.
- **MiniKit + native MediaRecorder** — Uses the existing MiniKit permission pattern for microphone access, and the browser's built-in MediaRecorder API for recording. No extra frontend dependencies.
- **New tab in AddKnowledgeModal** — Keeps the UI consistent with the existing knowledge source pattern (URL, Text, Voice).
- **Local filesystem storage** — Simple and sufficient for now. Audio files saved to `backend/voice_samples/{substrate_id}/`.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Recording UX | Single continuous recording | ElevenLabs needs ~2 min, simpler UX |
| Audio capture | Native MediaRecorder API | No extra deps, browser-native |
| Mic permission | MiniKit requestPermission | Required for World App mini apps |
| UI location | New "Voice" tab in AddKnowledgeModal | Consistent with existing knowledge flow |
| Backend storage | Local filesystem | Simple, sufficient for current scale |
| Audio format | WebM (MediaRecorder default) | Native output, can convert server-side if needed |
| Upload method | FormData multipart | Required for binary file upload |

## Feature Flow

1. User opens AddKnowledgeModal, selects "Voice" tab
2. UI shows a record button with instructions ("Record ~2 minutes of your voice")
3. User taps Record — MiniKit requests microphone permission (if not already granted)
4. Recording starts — timer counts up, basic waveform visualization shows audio levels
5. User taps Stop (or auto-stop at ~2 min limit)
6. User can preview playback before uploading
7. User taps Upload — audio blob sent as FormData to backend
8. Backend saves file to `voice_samples/{substrate_id}/{timestamp}.webm`
9. Success feedback shown in modal

## Technical Components

### Frontend
- **VoiceRecorder.tsx** — New component in `src/components/Knowledge/`
- **AddKnowledgeModal.tsx** — Add "Voice" tab alongside existing URL/Text tabs
- **substrate-api.ts** — Add `uploadVoiceSample()` function using FormData

### Backend
- **New router:** `backend/api/voice.py` — POST endpoint accepting file upload
- **Storage:** `backend/voice_samples/` directory
- **main.py** — Include voice router

### MiniKit Integration
- `MiniKit.commandsAsync.requestPermission({ permission: Permission.Microphone })`
- Check permission status before enabling record button

## Open Questions

- What is the exact audio format ElevenLabs prefers? May need server-side conversion from WebM to MP3/WAV.
- Should there be a maximum recording duration enforced (hard stop at 3 min)?
- Should users be able to re-record / replace an existing voice sample?
- Will the ElevenLabs API integration happen in a future iteration, or should we stub it now?
