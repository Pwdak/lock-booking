variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "alb_dns_name" {
  type = string
}

variable "price_class" {
  description = "PriceClass_100 = Europe/USA seulement (moins cher). PriceClass_All = couverture mondiale."
  type        = string
  default     = "PriceClass_100"
}
