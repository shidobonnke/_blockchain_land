FROM python:3.12-slim

WORKDIR /app
COPY api/requirements.txt /app/api/requirements.txt
RUN pip install --no-cache-dir -r /app/api/requirements.txt
COPY api /app/api
COPY packages/contracts/contracts /app/packages/contracts/contracts

EXPOSE 8100
CMD ["python", "api/main.py"]

