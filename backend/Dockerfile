FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Railway (and most PaaS platforms) assign the container's public port at
# runtime via $PORT and route traffic to whatever that resolves to; a
# hardcoded --port 8000 would silently not receive any traffic there.
# Falls back to 8000 for docker-compose and any other environment that
# doesn't set $PORT.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
