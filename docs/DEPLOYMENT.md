# TrueReact Deployment Guide

## Prerequisites

Before deploying TrueReact, ensure you have:

- [ ] Google Cloud Platform account with billing enabled
- [ ] `gcloud` CLI installed and authenticated
- [ ] Terraform installed (v1.0.0+)
- [ ] Docker installed
- [ ] Node.js 18+ installed
- [ ] Python 3.11+ installed

## Quick Start

### 1. Clone and Setup

```bash
cd TrueReact

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd ../mobile
npm install
```

### 2. Configure GCP

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  aiplatform.googleapis.com \
  discoveryengine.googleapis.com \
  logging.googleapis.com
```

### 3. Set Up Secrets

```bash
# Create secrets for sensitive values
echo -n "your-gemini-api-key" | gcloud secrets create gemini-api-key --data-file=-
echo -n "your-vertex-datastore-id" | gcloud secrets create vertex-datastore-id --data-file=-
```

### 4. Deploy Infrastructure (Terraform)

```bash
cd infrastructure/terraform

# Copy and edit variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your project details

# Initialize and apply
terraform init
terraform plan
terraform apply
```

### 5. Deploy Backend

```bash
# Option A: Using Cloud Build (recommended)
cd ../..
gcloud builds submit --config infrastructure/cloudbuild.yaml

# Option B: Manual deployment
cd backend
gcloud run deploy truereact-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

### 6. Configure Mobile App

```bash
cd mobile

# Update backend URL in src/hooks/useWebSocket.ts
# Replace placeholder URL with your Cloud Run URL

# Start development server
npx expo start
```

## Environment Configuration

### Backend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLOUD_PROJECT` | GCP Project ID | Yes |
| `GOOGLE_CLOUD_REGION` | GCP Region (e.g., us-central1) | Yes |
| `GEMINI_API_KEY` | Gemini API Key | Yes |
| `GEMINI_MODEL` | Gemini model name | No (default: gemini-2.0-flash-exp) |
| `VERTEX_SEARCH_DATASTORE_ID` | Vertex AI Search datastore | Yes |
| `APP_ENV` | Environment (dev/staging/prod) | No (default: development) |
| `DEBUG` | Enable debug mode | No (default: true) |
| `LOG_LEVEL` | Logging level | No (default: INFO) |
| `WS_MAX_CONNECTIONS` | Max WebSocket connections | No (default: 100) |
| `DISTRESS_THRESHOLD` | Safe state activation threshold | No (default: 0.7) |

### Mobile App Configuration

Edit `mobile/src/hooks/useWebSocket.ts`:

```typescript
const WS_URL = __DEV__ 
  ? 'ws://localhost:8080/ws/session' 
  : 'wss://YOUR-CLOUD-RUN-URL/ws/session';
```

## Local Development

### Running Backend Locally

```bash
cd backend

# Create .env file from example
cp .env.example .env
# Edit .env with your configuration

# Run with hot reload
python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8080
```

### Running Mobile App Locally

```bash
cd mobile

# Start Expo development server
npx expo start

# Or for specific platform
npx expo start --ios
npx expo start --android
```

### Testing WebSocket Connection

```bash
# Using websocat (install: cargo install websocat)
websocat ws://localhost:8080/ws/session/test-client

# Send a test message
{"type": "heartbeat", "timestamp": 1234567890}
```

## Setting Up Vertex AI Search

### Create Data Store

1. Go to [Vertex AI Search Console](https://console.cloud.google.com/gen-app-builder)
2. Create a new Data Store
3. Select "Generic" industry vertical
4. Enable "Content Required"
5. Name it `truereact-coaching-knowledge`

### Import Coaching Content

Prepare your CBT/DBT knowledge base as JSON:

```json
{
  "documents": [
    {
      "id": "technique-1",
      "title": "Congruence Practice",
      "content": "Technique for aligning facial expression with verbal communication...",
      "metadata": {
        "category": "expression",
        "source": "CBT Manual"
      }
    }
  ]
}
```

Upload to the data store via Console or API.

### Create Search Engine

1. Create a Search Engine linked to your data store
2. Enable LLM features for summarization
3. Note the Engine ID for backend configuration

## Production Checklist

### Security
- [ ] Enable Cloud Armor for DDoS protection
- [ ] Configure VPC Service Controls
- [ ] Set up Identity-Aware Proxy (if needed)
- [ ] Enable audit logging
- [ ] Review IAM permissions (principle of least privilege)

### Performance
- [ ] Set appropriate min/max instances
- [ ] Configure CPU/memory limits
- [ ] Enable Cloud CDN for static assets
- [ ] Set up health check endpoints

### Monitoring
- [ ] Configure alerting policies
- [ ] Set up uptime checks
- [ ] Create custom dashboards
- [ ] Enable trace sampling

### Compliance
- [ ] Add privacy policy
- [ ] Implement data retention policies
- [ ] Configure access logging
- [ ] Document data processing activities

## Troubleshooting

### Common Issues

**WebSocket Connection Fails**
```
Error: WebSocket connection failed
```
- Check Cloud Run URL is correct
- Verify service allows unauthenticated access
- Check CORS configuration

**Gemini API Errors**
```
Error: Failed to initialize Gemini API
```
- Verify API key is correct
- Check API is enabled in GCP Console
- Ensure service account has required permissions

**Camera/Microphone Not Working**
```
Error: Permission denied
```
- Ensure app has correct permissions in app.json
- User must grant permissions when prompted
- Check device settings for app permissions

### Debugging Tips

1. **Enable Debug Logging**
   ```bash
   export DEBUG=true
   export LOG_LEVEL=DEBUG
   ```

2. **Check Cloud Run Logs**
   ```bash
   gcloud run services logs read truereact-backend --region us-central1
   ```

3. **Monitor WebSocket Connections**
   ```bash
   curl https://YOUR-CLOUD-RUN-URL/health
   ```

## Scaling Considerations

### For High Traffic

```terraform
# In main.tf, adjust scaling settings
scaling {
  min_instance_count = 2
  max_instance_count = 50
}
```

### For Cost Optimization

```terraform
# For development/staging
scaling {
  min_instance_count = 0
  max_instance_count = 3
}
```

---

*Deployment Guide Version: 1.0*
*Last Updated: February 2026*
