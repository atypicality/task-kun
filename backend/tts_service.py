print("Starting TTS service...")

import os
from dotenv import load_dotenv
from elevenlabs import ElevenLabs
import re
import unicodedata

load_dotenv()

client = None

DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"
DEFAULT_MODEL_ID = "eleven_multilingual_v2"
MIKU_VOICE_ID = os.getenv("ELEVENLABS_MIKU_VOICE_ID", "").strip()


def initialize_model():
    global client

    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise ValueError("Missing ELEVENLABS_API_KEY in backend/.env")

    client = ElevenLabs(api_key=api_key)
    print("ElevenLabs client ready.")

# --------------------------------------------------
# Emoji Remover
# --------------------------------------------------

def _remove_emojis(text: str) -> str:
    """Remove emojis and special characters that may cause TTS glitches."""
    # Remove emoji patterns
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags (iOS)
        "\U00002500-\U00002BEF"  # chinese char
        "\U00002702-\U000027B0"
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "\U0001f926-\U0001f937"
        "\U00010000-\U0010ffff"
        "\u2640-\u2642"
        "\u2600-\u2B55"
        "\u200d"
        "\u23cf"
        "\u23e9"
        "\u231a"
        "\ufe0f"  # dingbats
        "\u3030"
        "]+", re.UNICODE)
    text = emoji_pattern.sub(r'', text)
    
    # Remove other problematic Unicode characters
    text = ''.join(c for c in text if not unicodedata.category(c).startswith('So'))
    
    return text.strip()

def generate_voice(text: str, use_miku: bool = False):
    global client

    if client is None:
        raise RuntimeError("TTS client not initialized. Call initialize_model() first.")

    text = _remove_emojis(text)

    if not text:
        raise ValueError("Text cannot be empty.")

    voice_id = MIKU_VOICE_ID if use_miku and MIKU_VOICE_ID else DEFAULT_VOICE_ID

    audio = client.text_to_speech.convert(
      voice_id=voice_id,
      output_format="mp3_44100_128",
      text=text,
      model_id="eleven_multilingual_v2",
    )

    if isinstance(audio, bytes):
        return audio

    return b"".join(audio)