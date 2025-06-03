FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch separately (this will be cached)
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install torch 

# Install PyTorch separately (this will be cached)
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install torchvision

RUN apt-get update && apt-get install -y libpq-dev gcc

# Install other dependencies with caching
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install psycopg2-binary==2.9.9

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install langchain-core langchain-community langchain-google-vertexai google-cloud-aiplatform nltk

# Copy requirements first for better caching
COPY requirements.txt .

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -v -r requirements.txt

RUN python -c "import nltk; nltk.download('stopwords')"

# ✅ PRODUCTION: Set Python environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# ✅ PRODUCTION: Copy GCP service account key
COPY gcp-service-account.json /app/gcp-service-account.json

# ✅ PRODUCTION: Set GCP credentials
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/gcp-service-account.json

# ✅ PRODUCTION: Copy application code
COPY . .

# ✅ PRODUCTION: Create uploads directory
RUN mkdir -p uploads

# ✅ PRODUCTION: Expose port
EXPOSE 8000

# ✅ PRODUCTION: Run with production settings
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]