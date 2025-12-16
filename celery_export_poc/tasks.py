import time
import csv
import os
import uuid
from app import celery, app

# Setup for pseudo-DB connection
# In a real scenario: import psycopg2 / from sqlalchemy import create_engine

def fetch_data_stream(limit=15000000):
    """
    Generator function simulating a Server-Side Cursor.
    Yields rows one by one or in small batches.
    """
    # Simulate streaming 15M rows (scaled down for POC speed, change limit to test)
    # Using a smaller number for demonstration unless we want to wait a long time
    demo_limit = 1000 # Simulating 15M with 1000 for quick POC
    
    headers = ['id', 'name', 'email', 'transaction_value', 'timestamp']
    yield headers # yield headers first
    
    for i in range(demo_limit):
        # Simulate processing time per row (very fast)
        # yield a tuple/list representing a row
        yield (
            i, 
            f"User_{i}", 
            f"user_{i}@example.com", 
            round(i * 1.5, 2), 
            "2023-10-27 10:00:00"
        )

@celery.task(bind=True)
def generate_csv_export(self):
    """
    Celery task to generate a large CSV file.
    Uses a streaming generator to write to disk without loading all data into RAM.
    """
    job_id = self.request.id
    filename = f"export_{job_id}.csv"
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    self.update_state(state='STARTED', meta={'status': 'Preparing to query database...'})
    
    try:
        # Open file for writing
        with open(file_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            
            # Use the streaming cursor function
            # In production, pass the actual DB cursor here
            row_count = 0
            for row in fetch_data_stream():
                writer.writerow(row)
                row_count += 1
                
                # Optional: Update status every N rows
                if row_count % 100 == 0:
                     self.update_state(state='STARTED', meta={'current_row': row_count, 'status': 'Writing rows...'})
        
        return {'filename': filename, 'total_rows': row_count, 'status': 'Task completed!'}

    except Exception as e:
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise e
