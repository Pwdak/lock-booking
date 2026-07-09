variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "ecr_repository_url" {
  type = string
}

variable "image_tag" {
  description = "Tag de l'image à déployer (ex: un SHA de commit). 'latest' déconseillé en prod (image_tag_mutability=IMMUTABLE l'interdit d'ailleurs côté ECR)."
  type        = string
  default     = "latest"
}

variable "container_port" {
  type    = number
  default = 4000
}

variable "cpu" {
  description = "En unités vCPU x1024 (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "memory" {
  description = "En Mo"
  type        = number
  default     = 512
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "alb_security_group_id" {
  type = string
}

variable "alb_target_group_arn" {
  type = string
}

variable "db_security_group_id" {
  description = "SG de la base RDS, pour lui ajouter une règle d'ingress depuis ECS"
  type        = string
}

# --- Variables applicatives (backend/server.js, backend/db.js, backend/auth.js) ---

variable "cors_origin" {
  description = "Domaine du frontend, ex: https://xxxx.cloudfront.net"
  type        = string
}

variable "database_url" {
  description = "Connection string Postgres complète (sensible, stockée dans Secrets Manager)"
  type        = string
  sensitive   = true
}

variable "app_secret" {
  description = "Secret HMAC pour signer les tokens d'auth (sensible)"
  type        = string
  sensitive   = true
}

variable "pro_username" {
  type    = string
  default = "pro"
}

variable "pro_password" {
  description = "Mot de passe du compte pro (sensible)"
  type        = string
  sensitive   = true
}

variable "auth_token_ttl_hours" {
  type    = number
  default = 12
}
