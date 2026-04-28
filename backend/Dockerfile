FROM python:3.12-slim

WORKDIR /code

# System deps
RUN apt-get update && apt-get install -y \
    gcc \
    libsndfile1 \
    sox \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Upgrade pip
RUN pip install --upgrade pip

# Install CPU-only torch first (avoids huge CUDA downloads)
RUN pip install --no-cache-dir torch==2.2.2+cpu torchaudio==2.2.2+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Install remaining deps
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]