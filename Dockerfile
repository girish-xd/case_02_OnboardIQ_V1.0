# Multi-stage Dockerfile for OnboardIQ Production Deployment

# ---- Stage 1: Build Frontend ----
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Build Backend ----
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# ---- Stage 3: Production Runtime ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies for backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Copy compiled backend
COPY --from=backend-builder /app/backend/dist ./backend/dist

# Copy reference datasets & rules config
COPY case_02_rules_config_V1.0.json ./
COPY case_02_occupations_V1.0.csv ./
COPY case_02_sanctions_list_V1.0.csv ./
COPY case_02_pep_list_V1.0.csv ./
COPY case_02_existing_customers_V1.0.csv ./
COPY case_02_applications_sample_V1.0.csv ./
COPY case_02_documents_sample_V1.0.csv ./
COPY case_02_document_text_sample_V1.0.jsonl ./
COPY case_02_extraction_mock_sample_V1.0.csv ./
COPY case_02_applications_eval_V1.0.csv ./
COPY case_02_documents_eval_V1.0.csv ./
COPY case_02_document_text_eval_V1.0.jsonl ./
COPY case_02_extraction_mock_eval_V1.0.csv ./
COPY case_02_document_truth_sample_V1.0.csv ./

# Copy compiled frontend assets for static serving
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create upload directory
RUN mkdir -p /app/backend/uploads

EXPOSE 5000

CMD ["node", "backend/dist/server.js"]
