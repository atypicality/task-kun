print("Starting TTS service...")

import torch
from qwen_tts import Qwen3TTSModel
import os
import numpy as np
import re
import unicodedata

# --------------------------------------------------
# Globals (do NOT load model at import time)
# --------------------------------------------------

model = None
DEVICE = "cpu"
DTYPE = torch.float32

REFERENCE_AUDIO = "miku.wav"
REFERENCE_TEXT = "alot of you have mental illness and you need to get it checked out if you are on my page and you don't like me and you don't even like yourself because you don't even have a picture of yourself probably because you're ugly as fuck and you come on my page to criticize me because you suck at life you need to see a therapist and get off social media ya bum"

# --------------------------------------------------
# Initialization Function (Call ONCE at startup)
# --------------------------------------------------

def initialize_model():
    global model, DEVICE, DTYPE

    print("Torch version:", torch.__version__)
    print("CUDA available:", torch.cuda.is_available())

    if torch.cuda.is_available():
        DEVICE = "cuda"
        DTYPE = torch.bfloat16
        print("GPU:", torch.cuda.get_device_name(0))

        torch.backends.cuda.enable_flash_sdp(True)
        torch.backends.cuda.enable_mem_efficient_sdp(True)
    else:
        DEVICE = "cpu"
        DTYPE = torch.float32
        print("Running on CPU")

    print("Loading Qwen3-TTS model...")

    model = Qwen3TTSModel.from_pretrained(
        "Qwen/Qwen3-TTS-12Hz-0.6B-Base",
        device_map=DEVICE,
        dtype=DTYPE,
        trust_remote_code=True
    )

    print("Model loaded on", DEVICE)

    if not os.path.exists(REFERENCE_AUDIO):
        raise FileNotFoundError(f"Missing reference audio: {REFERENCE_AUDIO}")

    # Optional warmup (CUDA only)
    if DEVICE == "cuda":
        print("Warming up...")
        with torch.inference_mode():
            _ = model.generate_voice_clone(
                text="Hello",
                language="English",
                ref_audio=REFERENCE_AUDIO,
                ref_text=REFERENCE_TEXT,
                max_new_tokens=32
            )
        print("Warmup complete.")


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


# --------------------------------------------------
# Silence Trimmer
# --------------------------------------------------

def _trim_trailing_silence(wav: np.ndarray, sr: int,
                           silence_thresh: float = 0.001,
                           keep_s: float = 0.05):
    if wav.ndim != 1:
        wav = wav.flatten()

    idx = np.where(np.abs(wav) > silence_thresh)[0]
    if idx.size == 0:
        return wav

    last = idx[-1]
    keep_samples = int(keep_s * sr)
    end = min(len(wav), last + 1 + keep_samples)
    return wav[:end]


# --------------------------------------------------
# Public TTS Function
# --------------------------------------------------

def generate_voice(text: str):
    global model

    if model is None:
        raise RuntimeError("Model not initialized. Call initialize_model() first.")

    # Clean emojis and problematic characters
    text = _remove_emojis(text)
    
    if not text:
        raise ValueError("Text is empty after emoji removal. Please provide valid text.")

    # Improved token calculation for longer texts
    min_cap = 40
    per_char = 5  # reduced from 6 for slightly more aggressive token estimation
    hard_ceiling = 600  # increased from 300 to handle longer texts
    estimated = 20 + len(text) * per_char
    max_tokens = int(min(hard_ceiling, max(min_cap, estimated)))

    gen_kwargs = dict(
        temperature=0.35,        # lower = more stable
        top_p=0.9,
        do_sample=True,
        repetition_penalty=1.08,
        max_new_tokens=max_tokens
    )

    # Use autocast ONLY if CUDA
    if DEVICE == "cuda":
        context = torch.autocast("cuda", dtype=DTYPE)
    else:
        from contextlib import nullcontext
        context = nullcontext()

    with torch.inference_mode(), context:
        wavs, sr = model.generate_voice_clone(
            text=text,
            language="English",
            ref_audio=REFERENCE_AUDIO,
            ref_text=REFERENCE_TEXT,
            **gen_kwargs
        )

    wav = wavs[0]
    if hasattr(wav, "cpu"):
        wav = wav.cpu().numpy()

    #wav = _trim_trailing_silence(wav, sr)

    return wav, sr