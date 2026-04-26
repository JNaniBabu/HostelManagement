# Deployment Guide

## Backend on Render

1. Create a new Render web service.
2. Connect the repository and choose the repo root (`HostelManagement`).
3. Render can use the `render.yaml` manifest from the repo root.
4. If Render does not use `render.yaml`, configure the service manually:
   - Environment: `Python`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn Backend.wsgi --log-file -`
5. Add the required environment variables in Render:
   - `DJANGO_SECRET_KEY`
   - `DATABASE_URL`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_NUMBER`
   - `CASHFREE_APP_ID`
   - `CASHFREE_SECRET_KEY`
   - `CASHFREE_BASE_URL`
   - `CASHFREE_API_VERSION`
   - `FRONTEND_URL=https://<your-frontend-host>.app`
   - `DJANGO_DEBUG=False`
   - `DJANGO_ALLOWED_HOSTS=<your-render-app>.onrender.com`
   - `CORS_ALLOWED_ORIGINS=https://<your-frontend-host>.app`
   - `CSRF_TRUSTED_ORIGINS=https://<your-frontend-host>.app`
   - `CSRF_COOKIE_SAMESITE=None`
   - `CSRF_COOKIE_SECURE=True`
   - `SESSION_COOKIE_SAMESITE=None`
   - `SESSION_COOKIE_SECURE=True`

6. After deployment, run migrations in Render's shell:
   ```bash
   python manage.py migrate
   ```
7. If needed, collect static files:
   ```bash
   python manage.py collectstatic --noinput
   ```

## Frontend

If your backend is on Render, keep the frontend on Vercel or any static host.

- Set `VITE_API_URL=https://<your-render-backend>.onrender.com`

## Notes

- The repo already includes:
  - `requirements.txt`
  - `Procfile`
  - `runtime.txt`
  - `render.yaml`
  - `Frontend/src/utils/apiConfig.js`
  - `Frontend/.env.example`
  - `.env.example`

- Your frontend now resolves API calls through `VITE_API_URL`.
- Backend production settings are configured to use env vars.
