variable "aws_region" {
  type        = string
  description = "Region AWS de deploiement."
  default     = "eu-west-3"
}

variable "project_name" {
  type        = string
  description = "Nom court utilise pour nommer les ressources AWS."
  default     = "locks-rdv"
}

variable "backend_image" {
  type        = string
  description = "Image Docker ECR complete du backend, par exemple repo:sha."
  default     = ""
}

variable "backend_desired_count" {
  type        = number
  description = "Nombre de taches ECS backend."
  default     = 1
}

variable "frontend_origin" {
  type        = string
  description = "Origine frontend autorisee par CORS. Laisser vide pour utiliser CloudFront."
  default     = ""
}

variable "db_name" {
  type        = string
  description = "Nom de la base PostgreSQL."
  default     = "locksrdv"
}

variable "db_username" {
  type        = string
  description = "Utilisateur PostgreSQL."
  default     = "locksadmin"
}

variable "db_password" {
  type        = string
  description = "Mot de passe PostgreSQL."
  sensitive   = true
}

variable "db_instance_class" {
  type        = string
  description = "Classe RDS. db.t3.micro est adaptee aux essais et au free tier selon compte/region."
  default     = "db.t3.micro"
}

variable "pro_username" {
  type        = string
  description = "Identifiant de connexion espace pro."
  default     = "pro"
}

variable "pro_password" {
  type        = string
  description = "Mot de passe espace pro."
  sensitive   = true
}

variable "app_secret" {
  type        = string
  description = "Secret HMAC pour signer les jetons d'authentification."
  sensitive   = true
}

variable "auth_token_ttl_hours" {
  type        = number
  description = "Duree de validite des sessions pro en heures."
  default     = 12
}