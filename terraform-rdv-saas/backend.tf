# Configuration partielle : les valeurs sont injectées au moment du `terraform init`
# via -backend-config, pas codées en dur ici. Permet de réutiliser ce code pour
# plusieurs environnements (dev/prod) avec des states séparés.
terraform {
  backend "s3" {}
}
