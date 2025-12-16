import os
from flask import Flask, jsonify, request, send_file, url_for
from celery import Celery, states

# --- Config ---
# Ensure you have Redis running: redis-server
# Ensure you have Postgres or modify the DB config as needed (simulated here)
REDIS_URL = 'redis://localhost:6379/0'
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'temp_exports')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
app.config['CELERY_BROKER_URL'] = REDIS_URL
app.config['CELERY_RESULT_BACKEND'] = REDIS_URL
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- Celery Setup ---
def make_celery(app):
    celery = Celery(
        app.import_name,
        backend=app.config['CELERY_RESULT_BACKEND'],
        broker=app.config['CELERY_BROKER_URL']
    )
    celery.conf.update(app.config)

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery

celery = make_celery(app)

# Import tasks after creating celery instance to avoid circular imports
# In a real package, this might be handled differently. 
# For this single-folder POC, we assume tasks.py exists.
import tasks

# --- Endpoints ---

@app.route('/api/export/start', methods=['POST'])
def start_export():
    """
    Starts the CSV export job.
    Returns: 202 Accepted with job_id.
    """
    # In a real app, you might parse request args for filters
    # filters = request.json.get('filters', {}) 
    
    # Launch the Celery task
    task = tasks.generate_csv_export.apply_async()
    
    return jsonify({
        'job_id': task.id,
        'message': 'Export started',
        'status_url': url_for('get_status', job_id=task.id, _external=True)
    }), 202

@app.route('/api/export/status/<job_id>', methods=['GET'])
def get_status(job_id):
    """
    Checks the status of the Celery task.
    Returns: Status string and download_url if SUCCESS.
    """
    task = tasks.generate_csv_export.AsyncResult(job_id)
    
    response = {
        'state': task.state,
        'status': task.state # redundancy for clarity
    }

    if task.state == 'PENDING':
        # Job has not started yet
        response['info'] = 'Waiting for worker...'
    elif task.state == states.IDLE or task.state == 'RETRY':
        response['info'] = 'Retrying...'
    elif task.state == 'STARTED':
        response['info'] = 'Processing...'
    elif task.state == 'SUCCESS':
        # task.result should be the filename returned by the task
        filename = task.result.get('filename')
        response['info'] = 'Export completed'
        response['download_url'] = url_for('download_file', filename=filename, _external=True)
        response['result'] = task.result
    elif task.state == 'FAILURE':
        response['info'] = 'Something went wrong'
        # task.info would be the exception info
        response['error'] = str(task.info)
    
    return jsonify(response)

@app.route('/api/export/download/<filename>', methods=['GET'])
def download_file(filename):
    """
    Streams the generated file to the client.
    """
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404

    # sending file as attachment
    return send_file(
        file_path,
        as_attachment=True,
        download_name=filename,
        mimetype='text/csv'
    )

if __name__ == '__main__':
    app.run(debug=True, port=5001)
