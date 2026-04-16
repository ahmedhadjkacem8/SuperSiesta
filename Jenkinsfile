pipeline {
    agent any

    environment {
        COMPOSE_INTERACTIVE_NO_CLI = '1'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build API') {
            steps {
                dir('SuperSiestaApi') {
                    // Example: Run tests or build image
                    sh 'echo "Building API..." '
                    // sh 'docker build -t supersiesta-api .'
                }
            }
        }

        stage('Build Frontend') {
            steps {
                dir('SuperSiestaFront') {
                    sh 'echo "Building Frontend..." '
                    // sh 'npm install'
                    // sh 'npm run build'
                }
            }
        }

        stage('Docker Compose Up') {
            steps {
                sh 'docker-compose up -d --build'
            }
        }
    }

    post {
        always {
            echo 'Pipeline completed.'
        }
    }
}
