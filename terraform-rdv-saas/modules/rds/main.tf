locals {
  name = "${var.project_name}-${var.environment}"
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db-subnets"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${local.name}-db-subnets"
  }
}

# Aucune règle d'ingress ici : c'est le module ecs qui ajoute la règle autorisant
# le trafic depuis le security group des tâches ECS (évite une dépendance circulaire).
resource "aws_security_group" "rds" {
  name        = "${local.name}-rds-sg"
  description = "Acces a la base RDS, restreint via regles ajoutees separement"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name}-rds-sg"
  }
}

resource "aws_db_instance" "postgres" {
  identifier     = "${local.name}-db"
  engine         = "postgres"
  engine_version = var.engine_version

  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  multi_az                = var.multi_az
  backup_retention_period  = var.backup_retention_days
  skip_final_snapshot      = false
  final_snapshot_identifier = "${local.name}-db-final-${formatdate("YYYYMMDD-hhmm", timestamp())}"
  deletion_protection      = true

  tags = {
    Name = "${local.name}-db"
  }

  lifecycle {
    ignore_changes = [final_snapshot_identifier]
  }
}
