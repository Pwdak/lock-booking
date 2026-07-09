variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "image_tag_mutability" {
  description = "MUTABLE permet d'écraser un tag (ex: 'latest'). IMMUTABLE force un tag unique par build."
  type        = string
  default     = "IMMUTABLE"
}
