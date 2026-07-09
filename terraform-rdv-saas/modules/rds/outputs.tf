output "db_endpoint" {
  description = "Endpoint host:port de l'instance"
  value       = aws_db_instance.postgres.endpoint
}

output "db_address" {
  description = "Host seul (sans le port)"
  value       = aws_db_instance.postgres.address
}

output "db_name" {
  value = aws_db_instance.postgres.db_name
}

output "db_security_group_id" {
  value = aws_security_group.rds.id
}

output "database_url" {
  description = "Connection string complète, à passer au backend via Secrets Manager (jamais en clair dans le state en sortie normale)"
  value       = "postgres://${urlencode(var.db_username)}:${urlencode(var.db_password)}@${aws_db_instance.postgres.address}:5432/${var.db_name}"
  sensitive   = true
}
