variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "container_port" {
  description = "Port sur lequel l'API backend écoute dans le conteneur"
  type        = number
  default     = 4000
}

variable "health_check_path" {
  type    = string
  default = "/api/health"
}
