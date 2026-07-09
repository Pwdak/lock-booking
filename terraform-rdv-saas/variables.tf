variable "project_name" {
  type    = string
  default = "lock-booking"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "aws_region" {
  type    = string
  default = "eu-west-1" # Irlande
}

variable "azs" {
  type    = list(string)
  default = ["eu-west-1a", "eu-west-1b"]
}

variable "db_password" {
  description = "Mot de passe admin RDS. Fournir via TF_VAR_db_password ou un fichier .tfvars non commité."
  type        = string
  sensitive   = true
}

variable "app_secret" {
  description = "Secret HMAC pour les tokens d'auth. Fournir via TF_VAR_app_secret."
  type        = string
  sensitive   = true
}

variable "pro_password" {
  description = "Mot de passe du compte pro. Fournir via TF_VAR_pro_password."
  type        = string
  sensitive   = true
}

variable "image_tag" {
  description = "Tag de l'image Docker à déployer (ex: SHA du commit)"
  type        = string
  default     = "latest"
}
