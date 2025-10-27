# Run database migrations before starting the server
echo "Running database migrations..."
python -m flask db upgrade

# Start the production web server using Gunicorn
echo "Starting Gunicorn server..."
gunicorn --bind 0.0.0.0:$PORT app:app