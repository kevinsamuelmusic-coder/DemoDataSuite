# Async Export POC

This directory contains a Proof of Concept (POC) for handling large-scale data exports (15M+ rows) using Flask, Celery, and Redis.

## Architecture

1.  **Flask API**: Handles the initial request (`/start`) and creates a background job.
2.  **Celery Worker**: running `tasks.py`, executes the long-running query using a streaming generator to avoid RAM spikes.
3.  **Redis**: Acts as the message broker for Celery.
4.  **ExportManager.jsx**: Frontend component that polls for status and handles the download.

## Prerequisites

- **Python 3.10+**
- **Redis Server** (Must be running locally on port 6379, or update `REDIS_URL` in `app.py`)

## Setup

1.  **Create Virtual Environment** (Optional but recommended):
    ```bash
    python -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    ```

2.  **Install Dependencies**:
    ```bash
    pip install flask celery redis
    # If using real DB: pip install psycopg2-binary sqlalchemy
    ```

## Usage

You need to run the Flask server and the Celery worker in separate terminal windows.

### Terminal 1: Celery Worker
Navigate to this directory (`celery_export_poc`) and run:

```bash
# Windows
celery -A app.celery worker --loglevel=info --pool=solo

# Linux/Mac
celery -A app.celery worker --loglevel=info
```
*Note: On Windows, use `--pool=solo` or `--pool=gevent` if you encounter freezing issues.*

### Terminal 2: Flask API
Navigate to this directory and run:

```bash
python app.py
```

The API will start at `http://localhost:5001`.

## Testing

1.  Send a POST request to start the job:
    ```bash
    curl -X POST http://localhost:5001/api/export/start
    ```
    Response:
    ```json
    {
      "job_id": "c84f502c-...",
      "message": "Export started",
      "status_url": "http://localhost:5001/api/export/status/c84f502c-..."
    }
    ```

2.  Check the status using the returned `status_url` or `job_id`:
    ```bash
    curl http://localhost:5001/api/export/status/<job_id>
    ```

3.  Once `"state": "SUCCESS"`, use the `download_url` to get your CSV.

## Notes on Scaling (15M Records)

- The `tasks.py` file uses `fetch_data_stream()` as a generator. In a real Postgres implementation, you would use a server-side cursor.
- Example with `psycopg2`:
    ```python
    with conn.cursor(name='server_side_cursor_name') as cursor:
        cursor.execute("SELECT * FROM large_table")
        while True:
            rows = cursor.fetchmany(size=2000)
            if not rows:
                break
            for row in rows:
                yield row
    ```
- This ensures that only a small chunk of data exists in memory at any given time.
