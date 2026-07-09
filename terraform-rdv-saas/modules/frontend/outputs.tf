output "bucket_name" {
  value = aws_s3_bucket.frontend.bucket
}

output "distribution_id" {
  value = aws_cloudfront_distribution.main.id
}

output "distribution_domain_name" {
  description = "URL publique du site, ex: d1234abcd.cloudfront.net"
  value       = aws_cloudfront_distribution.main.domain_name
}
