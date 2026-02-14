# AI Workflows

This directory contains AI workflow configurations and Vertex AI integration code.

## Structure

- `vertex-ai/` - Vertex AI client implementations (for production)
- `models/` - Model configurations and schemas
- `pipelines/` - AI pipeline definitions

## Local Development

The AI service uses simulation mode when `VERTEX_AI_PROJECT_ID` is not set or in development mode.

## Production Deployment

To use real Vertex AI services:

1. Set `VERTEX_AI_PROJECT_ID` in your environment
2. Install Vertex AI SDK: `npm install @google-cloud/aiplatform`
3. Update `backend/src/services/aiService.js` to use actual Vertex AI clients
4. Configure authentication (service account key or Workload Identity)




