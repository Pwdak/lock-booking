variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "vpc_cidr" {
  description = "CIDR du VPC, utilisé pour restreindre l'accès réseau par défaut"
  type        = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "db_name" {
  type    = string
  default = "lockbooking"
}

variable "db_username" {
  type    = string
  default = "lockbooking_admin"
}

variable "db_password" {
  description = "Mot de passe admin de la base. Ne jamais mettre de valeur par défaut ni la commiter."
  type        = string
  sensitive   = true
}

variable "instance_class" {
  type    = string
  default = "db.t4g.micro" # éligible Free Tier
}

variable "allocated_storage" {
  type    = number
  default = 20
}

variable "engine_version" {
  description = "Version majeure seulement 16 : AWS choisit automatiquement la derniere version mineure disponible"
  type    = string
  default = "16"
}

variable "multi_az" {
  description = "true = 2ᵉ instance en standby dans une autre AZ (résilience, coût x2)"
  type        = bool
  default     = false
}

variable "backup_retention_days" {
  type    = number
  default = 7
}
