locals {
  name = "${var.project_name}-${var.environment}"
}

# ---------------------------------------------------------------------------
# Secrets (Secrets Manager) — jamais en clair dans la task definition
# ---------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "database_url" {
  name = "${local.name}/database-url"
}
resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = var.database_url
}

resource "aws_secretsmanager_secret" "app_secret" {
  name = "${local.name}/app-secret"
}
resource "aws_secretsmanager_secret_version" "app_secret" {
  secret_id     = aws_secretsmanager_secret.app_secret.id
  secret_string = var.app_secret
}

resource "aws_secretsmanager_secret" "pro_password" {
  name = "${local.name}/pro-password"
}
resource "aws_secretsmanager_secret_version" "pro_password" {
  secret_id     = aws_secretsmanager_secret.pro_password.id
  secret_string = var.pro_password
}

# ---------------------------------------------------------------------------
# Cluster
# ---------------------------------------------------------------------------
resource "aws_ecs_cluster" "main" {
  name = "${local.name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.name}-backend"
  retention_in_days = 14
}

# ---------------------------------------------------------------------------
# IAM — rôle d'execution (pull ECR, écrire les logs, lire les secrets)
# ---------------------------------------------------------------------------
resource "aws_iam_role" "execution" {
  name = "${local.name}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "execution_secrets" {
  name = "${local.name}-read-secrets"
  role = aws_iam_role.execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [
        aws_secretsmanager_secret.database_url.arn,
        aws_secretsmanager_secret.app_secret.arn,
        aws_secretsmanager_secret.pro_password.arn,
      ]
    }]
  })
}

# Rôle applicatif (permissions AWS utilisées PAR le code au runtime).
# Vide pour l'instant : le backend actuel n'appelle aucun service AWS directement.
resource "aws_iam_role" "task" {
  name = "${local.name}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

# ---------------------------------------------------------------------------
# Réseau — SG des taches : n'accepte que le trafic venant de l'ALB
# ---------------------------------------------------------------------------
resource "aws_security_group" "tasks" {
  name        = "${local.name}-ecs-tasks-sg"
  description = "Autorise uniquement le trafic depuis ALB vers le port du conteneur"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Depuis ALB"
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name}-ecs-tasks-sg"
  }
}

# Complète le SG de RDS (cree dans le module rds) : autorise ECS -> Postgres
resource "aws_security_group_rule" "rds_from_ecs" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = var.db_security_group_id
  source_security_group_id = aws_security_group.tasks.id
  description               = "Postgres depuis les taches ECS"
}

# ---------------------------------------------------------------------------
# Task definition & service
# ---------------------------------------------------------------------------
resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn             = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${var.ecr_repository_url}:${var.image_tag}"
      essential = true
      portMappings = [{
        containerPort = var.container_port
        protocol      = "tcp"
      }]
      environment = [
        { name = "PORT", value = tostring(var.container_port) },
        { name = "CORS_ORIGIN", value = var.cors_origin },
        { name = "PGSSL", value = "true" },
        { name = "PRO_USERNAME", value = var.pro_username },
        { name = "AUTH_TOKEN_TTL_HOURS", value = tostring(var.auth_token_ttl_hours) },
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.database_url.arn },
        { name = "APP_SECRET", valueFrom = aws_secretsmanager_secret.app_secret.arn },
        { name = "PRO_PASSWORD", valueFrom = aws_secretsmanager_secret.pro_password.arn },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "backend"
        }
      }
    }
  ])
}

data "aws_region" "current" {}

resource "aws_ecs_service" "backend" {
  name            = "${local.name}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arn
    container_name    = "backend"
    container_port    = var.container_port
  }

  depends_on = [aws_iam_role_policy_attachment.execution_managed]
}
