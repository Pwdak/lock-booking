module "vpc" {
  source = "./modules/vpc"

  project_name       = var.project_name
  environment        = var.environment
  azs                = var.azs
  single_nat_gateway = true # false en prod si le budget le permet (résilience multi-AZ)
}

module "alb" {
  source = "./modules/alb"

  project_name      = var.project_name
  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  container_port    = 4000
}

module "ecr" {
  source = "./modules/ecr"

  project_name = var.project_name
  environment  = var.environment
}

module "rds" {
  source = "./modules/rds"

  project_name        = var.project_name
  environment         = var.environment
  vpc_id              = module.vpc.vpc_id
  vpc_cidr            = module.vpc.vpc_cidr
  private_subnet_ids  = module.vpc.private_subnet_ids
  db_password         = var.db_password
  multi_az            = false # true en prod si le budget le permet
}

module "frontend" {
  source = "./modules/frontend"

  project_name = var.project_name
  environment  = var.environment
  alb_dns_name = module.alb.alb_dns_name
}

module "ecs" {
  source = "./modules/ecs"

  project_name           = var.project_name
  environment            = var.environment
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids
  ecr_repository_url     = module.ecr.repository_url
  image_tag               = var.image_tag
  alb_security_group_id  = module.alb.alb_security_group_id
  alb_target_group_arn   = module.alb.target_group_arn
  db_security_group_id   = module.rds.db_security_group_id

  cors_origin  = "https://${module.frontend.distribution_domain_name}"
  database_url = module.rds.database_url
  app_secret   = var.app_secret
  pro_password = var.pro_password
}
