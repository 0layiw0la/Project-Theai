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
# Install PyTorch separately (this will be cached)
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install psycopg2-binary==2.9.9

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install langchain-core langchain-community langchain-google-vertexai google-cloud-aiplatform nltk
    # Copy requirements first for better caching
COPY requirements.txt .

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -v -r requirements.txt

RUN python -c "import nltk; nltk.download('stopwords')"

# Copy the rest of the application
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Default command (can be overridden)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]