output "frontend_url" {
  description = "URL CloudFront du frontend."
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "frontend_bucket_name" {
  description = "Bucket S3 ou synchroniser le build frontend."
  value       = aws_s3_bucket.frontend.bucket
}

output "cloudfront_distribution_id" {
  description = "Distribution CloudFront a invalider apres upload."
  value       = aws_cloudfront_distribution.frontend.id
}

output "backend_url" {
  description = "URL HTTPS a utiliser par le frontend pour appeler /api via CloudFront."
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "alb_backend_url" {
  description = "URL HTTP directe de l'ALB backend, utile pour debug uniquement."
  value       = "http://${aws_lb.backend.dns_name}"
}

output "ecr_repository_url" {
  description = "Repository ECR pour pousser l'image backend."
  value       = aws_ecr_repository.backend.repository_url
}

output "rds_endpoint" {
  description = "Endpoint RDS PostgreSQL prive."
  value       = aws_db_instance.postgres.address
}