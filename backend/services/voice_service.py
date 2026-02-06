import base64
from elevenlabs import ElevenLabs
from config import get_settings


class VoiceService:
    """Wrapper around ElevenLabs SDK for voice cloning and TTS."""

    def __init__(self):
        settings = get_settings()
        self.client = ElevenLabs(api_key=settings.elevenlabs_api_key)

    def create_voice_clone(self, name: str, audio_file_path: str) -> str:
        """Create an instant voice clone from an audio file. Returns the voice_id."""
        voice = self.client.voices.ivc.create(
            name=name,
            files=[audio_file_path],
        )
        return voice.voice_id

    def text_to_speech(self, voice_id: str, text: str) -> bytes:
        """Convert text to speech using a cloned voice. Returns MP3 bytes."""
        audio_iterator = self.client.text_to_speech.convert(
            voice_id=voice_id,
            text=text,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
        )
        # convert() returns an iterator of bytes chunks
        return b"".join(audio_iterator)

    def text_to_speech_base64(self, voice_id: str, text: str) -> str:
        """Convert text to speech and return as base64-encoded string."""
        audio_bytes = self.text_to_speech(voice_id, text)
        return base64.b64encode(audio_bytes).decode("utf-8")

    def delete_voice(self, voice_id: str) -> None:
        """Delete a voice clone from ElevenLabs."""
        self.client.voices.delete(voice_id=voice_id)
