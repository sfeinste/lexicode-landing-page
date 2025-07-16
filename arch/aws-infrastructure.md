# AWS Infrastructure Architecture

## Overview

This document outlines the AWS infrastructure architecture for the Lexicode SaaS platform using Terraform for Infrastructure as Code (IaC). The architecture follows AWS best practices for security, scalability, and cost optimization.

## Infrastructure Components

### Networking Layer

```hcl
# VPC Configuration
resource "aws_vpc" "lexicode_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name        = "lexicode-vpc"
    Environment = var.environment
  }
}

# Internet Gateway
resource "aws_internet_gateway" "lexicode_igw" {
  vpc_id = aws_vpc.lexicode_vpc.id
  
  tags = {
    Name        = "lexicode-igw"
    Environment = var.environment
  }
}

# Public Subnets
resource "aws_subnet" "public_subnet_1" {
  vpc_id                  = aws_vpc.lexicode_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true
  
  tags = {
    Name        = "lexicode-public-subnet-1"
    Environment = var.environment
  }
}

resource "aws_subnet" "public_subnet_2" {
  vpc_id                  = aws_vpc.lexicode_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true
  
  tags = {
    Name        = "lexicode-public-subnet-2"
    Environment = var.environment
  }
}

# Private Subnets
resource "aws_subnet" "private_subnet_1" {
  vpc_id            = aws_vpc.lexicode_vpc.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = data.aws_availability_zones.available.names[0]
  
  tags = {
    Name        = "lexicode-private-subnet-1"
    Environment = var.environment
  }
}

resource "aws_subnet" "private_subnet_2" {
  vpc_id            = aws_vpc.lexicode_vpc.id
  cidr_block        = "10.0.12.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]
  
  tags = {
    Name        = "lexicode-private-subnet-2"
    Environment = var.environment
  }
}

# Database Subnets
resource "aws_subnet" "database_subnet_1" {
  vpc_id            = aws_vpc.lexicode_vpc.id
  cidr_block        = "10.0.21.0/24"
  availability_zone = data.aws_availability_zones.available.names[0]
  
  tags = {
    Name        = "lexicode-database-subnet-1"
    Environment = var.environment
  }
}

resource "aws_subnet" "database_subnet_2" {
  vpc_id            = aws_vpc.lexicode_vpc.id
  cidr_block        = "10.0.22.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]
  
  tags = {
    Name        = "lexicode-database-subnet-2"
    Environment = var.environment
  }
}

# NAT Gateways
resource "aws_eip" "nat_eip_1" {
  domain = "vpc"
  
  tags = {
    Name        = "lexicode-nat-eip-1"
    Environment = var.environment
  }
}

resource "aws_eip" "nat_eip_2" {
  domain = "vpc"
  
  tags = {
    Name        = "lexicode-nat-eip-2"
    Environment = var.environment
  }
}

resource "aws_nat_gateway" "nat_gateway_1" {
  allocation_id = aws_eip.nat_eip_1.id
  subnet_id     = aws_subnet.public_subnet_1.id
  
  tags = {
    Name        = "lexicode-nat-gateway-1"
    Environment = var.environment
  }
}

resource "aws_nat_gateway" "nat_gateway_2" {
  allocation_id = aws_eip.nat_eip_2.id
  subnet_id     = aws_subnet.public_subnet_2.id
  
  tags = {
    Name        = "lexicode-nat-gateway-2"
    Environment = var.environment
  }
}
```

### Security Groups

```hcl
# ALB Security Group
resource "aws_security_group" "alb_sg" {
  name        = "lexicode-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.lexicode_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "lexicode-alb-sg"
    Environment = var.environment
  }
}

# ECS Security Group
resource "aws_security_group" "ecs_sg" {
  name        = "lexicode-ecs-sg"
  description = "Security group for ECS tasks"
  vpc_id      = aws_vpc.lexicode_vpc.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "lexicode-ecs-sg"
    Environment = var.environment
  }
}

# RDS Security Group
resource "aws_security_group" "rds_sg" {
  name        = "lexicode-rds-sg"
  description = "Security group for RDS database"
  vpc_id      = aws_vpc.lexicode_vpc.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_sg.id]
  }

  tags = {
    Name        = "lexicode-rds-sg"
    Environment = var.environment
  }
}

# Redis Security Group
resource "aws_security_group" "redis_sg" {
  name        = "lexicode-redis-sg"
  description = "Security group for Redis cluster"
  vpc_id      = aws_vpc.lexicode_vpc.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_sg.id]
  }

  tags = {
    Name        = "lexicode-redis-sg"
    Environment = var.environment
  }
}
```

### Database Layer

```hcl
# RDS Subnet Group
resource "aws_db_subnet_group" "lexicode_db_subnet_group" {
  name       = "lexicode-db-subnet-group"
  subnet_ids = [aws_subnet.database_subnet_1.id, aws_subnet.database_subnet_2.id]

  tags = {
    Name        = "lexicode-db-subnet-group"
    Environment = var.environment
  }
}

# RDS Parameter Group
resource "aws_db_parameter_group" "lexicode_pg" {
  family = "postgres15"
  name   = "lexicode-postgres-params"

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = {
    Name        = "lexicode-postgres-params"
    Environment = var.environment
  }
}

# RDS Instance
resource "aws_db_instance" "lexicode_postgres" {
  identifier     = "lexicode-postgres-${var.environment}"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true
  
  db_name  = "lexicode"
  username = "lexicode_admin"
  password = random_password.db_password.result
  
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.lexicode_db_subnet_group.name
  parameter_group_name   = aws_db_parameter_group.lexicode_pg.name
  
  backup_retention_period = var.environment == "production" ? 7 : 3
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  multi_az               = var.environment == "production"
  publicly_accessible    = false
  deletion_protection    = var.environment == "production"
  skip_final_snapshot    = var.environment != "production"
  
  performance_insights_enabled = true
  monitoring_interval         = 60
  monitoring_role_arn        = aws_iam_role.rds_monitoring_role.arn
  
  tags = {
    Name        = "lexicode-postgres"
    Environment = var.environment
  }
}

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "lexicode_cache_subnet_group" {
  name       = "lexicode-cache-subnet-group"
  subnet_ids = [aws_subnet.database_subnet_1.id, aws_subnet.database_subnet_2.id]

  tags = {
    Name        = "lexicode-cache-subnet-group"
    Environment = var.environment
  }
}

# ElastiCache Redis Cluster
resource "aws_elasticache_replication_group" "lexicode_redis" {
  replication_group_id       = "lexicode-redis-${var.environment}"
  description                = "Redis cluster for Lexicode"
  
  port                       = 6379
  parameter_group_name       = "default.redis7"
  node_type                  = var.redis_node_type
  num_cache_clusters         = var.environment == "production" ? 2 : 1
  
  subnet_group_name          = aws_elasticache_subnet_group.lexicode_cache_subnet_group.name
  security_group_ids         = [aws_security_group.redis_sg.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result
  
  snapshot_retention_limit   = var.environment == "production" ? 5 : 1
  snapshot_window           = "03:00-05:00"
  maintenance_window        = "sun:05:00-sun:07:00"
  
  tags = {
    Name        = "lexicode-redis"
    Environment = var.environment
  }
}
```

### Compute Layer (ECS)

```hcl
# ECS Cluster
resource "aws_ecs_cluster" "lexicode_cluster" {
  name = "lexicode-cluster-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "lexicode-cluster"
    Environment = var.environment
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "lexicode_api" {
  family                   = "lexicode-api-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "lexicode-api"
      image = "${aws_ecr_repository.lexicode_api.repository_url}:latest"
      
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3000"
        }
      ]
      
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.database_url.arn
        },
        {
          name      = "REDIS_URL"
          valueFrom = aws_secretsmanager_secret.redis_url.arn
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.lexicode_api.name
          awslogs-region        = data.aws_region.current.name
          awslogs-stream-prefix = "ecs"
        }
      }
      
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name        = "lexicode-api-task"
    Environment = var.environment
  }
}

# ECS Service
resource "aws_ecs_service" "lexicode_api" {
  name            = "lexicode-api-${var.environment}"
  cluster         = aws_ecs_cluster.lexicode_cluster.id
  task_definition = aws_ecs_task_definition.lexicode_api.arn
  desired_count   = var.api_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.private_subnet_1.id, aws_subnet.private_subnet_2.id]
    security_groups  = [aws_security_group.ecs_sg.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.lexicode_api.arn
    container_name   = "lexicode-api"
    container_port   = 3000
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [aws_lb_listener.lexicode_api]

  tags = {
    Name        = "lexicode-api-service"
    Environment = var.environment
  }
}

# Auto Scaling
resource "aws_appautoscaling_target" "lexicode_api" {
  max_capacity       = var.api_max_capacity
  min_capacity       = var.api_min_capacity
  resource_id        = "service/${aws_ecs_cluster.lexicode_cluster.name}/${aws_ecs_service.lexicode_api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  tags = {
    Name        = "lexicode-api-autoscaling"
    Environment = var.environment
  }
}

resource "aws_appautoscaling_policy" "lexicode_api_cpu" {
  name               = "lexicode-api-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.lexicode_api.resource_id
  scalable_dimension = aws_appautoscaling_target.lexicode_api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.lexicode_api.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

### Load Balancer

```hcl
# Application Load Balancer
resource "aws_lb" "lexicode_alb" {
  name               = "lexicode-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_subnet_1.id, aws_subnet.public_subnet_2.id]

  enable_deletion_protection = var.environment == "production"

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.bucket
    prefix  = "alb-logs"
    enabled = true
  }

  tags = {
    Name        = "lexicode-alb"
    Environment = var.environment
  }
}

# Target Group
resource "aws_lb_target_group" "lexicode_api" {
  name        = "lexicode-api-tg-${var.environment}"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.lexicode_vpc.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
    port                = "traffic-port"
    protocol            = "HTTP"
  }

  tags = {
    Name        = "lexicode-api-tg"
    Environment = var.environment
  }
}

# ALB Listener
resource "aws_lb_listener" "lexicode_api" {
  load_balancer_arn = aws_lb.lexicode_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.lexicode_cert.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.lexicode_api.arn
  }
}

# HTTP to HTTPS Redirect
resource "aws_lb_listener" "lexicode_redirect" {
  load_balancer_arn = aws_lb.lexicode_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
```

### Storage Layer

```hcl
# S3 Bucket for Documentation Storage
resource "aws_s3_bucket" "lexicode_docs" {
  bucket = "lexicode-docs-${var.environment}-${random_id.bucket_suffix.hex}"

  tags = {
    Name        = "lexicode-docs"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "lexicode_docs" {
  bucket = aws_s3_bucket.lexicode_docs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "lexicode_docs" {
  bucket = aws_s3_bucket.lexicode_docs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "lexicode_docs" {
  bucket = aws_s3_bucket.lexicode_docs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket for ALB Logs
resource "aws_s3_bucket" "alb_logs" {
  bucket = "lexicode-alb-logs-${var.environment}-${random_id.bucket_suffix.hex}"

  tags = {
    Name        = "lexicode-alb-logs"
    Environment = var.environment
  }
}

# SQS Queue for Background Jobs
resource "aws_sqs_queue" "lexicode_jobs" {
  name                      = "lexicode-jobs-${var.environment}"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 1209600
  receive_wait_time_seconds = 0
  visibility_timeout_seconds = 300

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.lexicode_jobs_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name        = "lexicode-jobs"
    Environment = var.environment
  }
}

# SQS Dead Letter Queue
resource "aws_sqs_queue" "lexicode_jobs_dlq" {
  name                      = "lexicode-jobs-dlq-${var.environment}"
  message_retention_seconds = 1209600

  tags = {
    Name        = "lexicode-jobs-dlq"
    Environment = var.environment
  }
}
```

### Monitoring and Logging

```hcl
# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lexicode_api" {
  name              = "/ecs/lexicode-api-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "lexicode-api-logs"
    Environment = var.environment
  }
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "lexicode-high-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS cpu utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.lexicode_cluster.name
    ServiceName = aws_ecs_service.lexicode_api.name
  }

  tags = {
    Name        = "lexicode-high-cpu-alarm"
    Environment = var.environment
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "lexicode-alerts-${var.environment}"

  tags = {
    Name        = "lexicode-alerts"
    Environment = var.environment
  }
}
```

## Environment-Specific Variables

### Production Environment (`terraform.tfvars`)
```hcl
environment = "production"

# Database
db_instance_class = "db.t3.medium"

# Redis
redis_node_type = "cache.t3.micro"

# ECS
api_cpu            = 512
api_memory         = 1024
api_desired_count  = 3
api_min_capacity   = 2
api_max_capacity   = 10

# Logging
log_retention_days = 30

# Domain
domain_name = "api.lexicode.com"
```

### Development Environment (`dev.tfvars`)
```hcl
environment = "development"

# Database
db_instance_class = "db.t3.micro"

# Redis
redis_node_type = "cache.t3.micro"

# ECS
api_cpu            = 256
api_memory         = 512
api_desired_count  = 1
api_min_capacity   = 1
api_max_capacity   = 3

# Logging
log_retention_days = 7

# Domain
domain_name = "api-dev.lexicode.com"
```

## Cost Optimization Strategies

1. **Right-sizing Resources**: Use appropriate instance sizes for each environment
2. **Auto Scaling**: Scale ECS tasks based on demand
3. **Spot Instances**: Use Spot instances for non-critical workloads
4. **Storage Lifecycle**: S3 lifecycle policies for old documentation
5. **Reserved Instances**: For predictable workloads in production
6. **Monitoring**: CloudWatch cost monitoring and budgets

## Disaster Recovery

1. **Multi-AZ Deployment**: RDS and Redis with Multi-AZ
2. **Automated Backups**: RDS automated backups with point-in-time recovery
3. **Cross-Region Replication**: S3 cross-region replication for critical data
4. **Infrastructure as Code**: Terraform for rapid environment recreation
5. **Blue-Green Deployment**: Zero-downtime deployments

## Security Best Practices

1. **Network Segmentation**: Private subnets for application and database tiers
2. **Least Privilege**: IAM roles with minimal required permissions
3. **Encryption**: All data encrypted at rest and in transit
4. **Secrets Management**: AWS Secrets Manager for sensitive data
5. **Monitoring**: CloudTrail and GuardDuty for security monitoring
6. **WAF**: Web Application Firewall for protection against common attacks