# TrueReact - Terraform Configuration
#
# Infrastructure as Code for GCP resources

terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "truereact-terraform-state"
    prefix = "terraform/state"
  }
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

# Provider configuration
provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "secretmanager.googleapis.com",
    "aiplatform.googleapis.com",
    "discoveryengine.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
  ])
  
  project = var.project_id
  service = each.value
  
  disable_on_destroy = false
}

# Service Account for Cloud Run
resource "google_service_account" "truereact_backend" {
  account_id   = "truereact-backend"
  display_name = "TrueReact Backend Service Account"
  description  = "Service account for TrueReact Cloud Run backend"
}

# IAM bindings for the service account
resource "google_project_iam_member" "backend_permissions" {
  for_each = toset([
    "roles/aiplatform.user",
    "roles/discoveryengine.viewer",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/secretmanager.secretAccessor",
  ])
  
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.truereact_backend.email}"
}

# Secret Manager - Gemini API Key
resource "google_secret_manager_secret" "gemini_api_key" {
  secret_id = "gemini-api-key"
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.required_apis]
}

# Secret Manager - Vertex Datastore ID
resource "google_secret_manager_secret" "vertex_datastore_id" {
  secret_id = "vertex-datastore-id"
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.required_apis]
}

# Cloud Run Service
resource "google_cloud_run_v2_service" "truereact_backend" {
  name     = "truereact-backend"
  location = var.region
  
  template {
    service_account = google_service_account.truereact_backend.email
    
    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }
    
    containers {
      image = "gcr.io/${var.project_id}/truereact-backend:latest"
      
      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }
      
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      
      env {
        name  = "GOOGLE_CLOUD_REGION"
        value = var.region
      }
      
      env {
        name  = "APP_ENV"
        value = var.environment
      }
      
      env {
        name = "GEMINI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.gemini_api_key.secret_id
            version = "latest"
          }
        }
      }
      
      env {
        name = "VERTEX_SEARCH_DATASTORE_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.vertex_datastore_id.secret_id
            version = "latest"
          }
        }
      }
      
      ports {
        container_port = 8080
      }
      
      startup_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        initial_delay_seconds = 10
        timeout_seconds       = 5
        period_seconds        = 10
        failure_threshold     = 3
      }
      
      liveness_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        timeout_seconds   = 5
        period_seconds    = 30
        failure_threshold = 3
      }
    }
    
    timeout = "3600s"
  }
  
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
  
  depends_on = [
    google_project_service.required_apis,
    google_project_iam_member.backend_permissions,
  ]
}

# Allow unauthenticated access (for the mobile app)
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.truereact_backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Vertex AI Search Datastore (for CBT/DBT grounding)
resource "google_discovery_engine_data_store" "coaching_knowledge" {
  provider      = google-beta
  location      = "global"
  data_store_id = "truereact-coaching-knowledge"
  display_name  = "TrueReact Coaching Knowledge Base"
  
  industry_vertical = "GENERIC"
  content_config    = "CONTENT_REQUIRED"
  
  solution_types = ["SOLUTION_TYPE_SEARCH"]
  
  depends_on = [google_project_service.required_apis]
}

# Vertex AI Search Engine
resource "google_discovery_engine_search_engine" "coaching_search" {
  provider       = google-beta
  engine_id      = "truereact-coaching-search"
  collection_id  = "default_collection"
  location       = "global"
  display_name   = "TrueReact Coaching Search"
  
  data_store_ids = [google_discovery_engine_data_store.coaching_knowledge.data_store_id]
  
  search_engine_config {
    search_tier    = "SEARCH_TIER_ENTERPRISE"
    search_add_ons = ["SEARCH_ADD_ON_LLM"]
  }
  
  depends_on = [google_discovery_engine_data_store.coaching_knowledge]
}

# Cloud Logging - Log Bucket for session analytics
resource "google_logging_project_bucket_config" "truereact_logs" {
  project        = var.project_id
  location       = var.region
  bucket_id      = "truereact-sessions"
  retention_days = 30
  
  depends_on = [google_project_service.required_apis]
}

# Cloud Monitoring - Alert Policy for errors
resource "google_monitoring_alert_policy" "error_rate" {
  display_name = "TrueReact High Error Rate"
  
  conditions {
    display_name = "Error rate > 5%"
    
    condition_threshold {
      filter          = "resource.type = \"cloud_run_revision\" AND resource.labels.service_name = \"truereact-backend\" AND metric.type = \"run.googleapis.com/request_count\" AND metric.labels.response_code_class = \"5xx\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }
  
  notification_channels = []
  
  alert_strategy {
    auto_close = "604800s"
  }
  
  depends_on = [google_project_service.required_apis]
}

# Outputs
output "cloud_run_url" {
  description = "URL of the Cloud Run service"
  value       = google_cloud_run_v2_service.truereact_backend.uri
}

output "service_account_email" {
  description = "Email of the service account"
  value       = google_service_account.truereact_backend.email
}

output "datastore_id" {
  description = "ID of the Vertex AI Search datastore"
  value       = google_discovery_engine_data_store.coaching_knowledge.data_store_id
}
