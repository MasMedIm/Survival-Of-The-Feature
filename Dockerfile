FROM node:18-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
      python3 python3-pip git curl unzip jq uuid-runtime qrencode && \
    rm -rf /var/lib/apt/lists/*

# Install AWS CLI v2
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip" && \
    unzip /tmp/awscliv2.zip -d /tmp && \
    /tmp/aws/install && \
    rm -rf /tmp/awscliv2.zip /tmp/aws

# Install AWS SAM CLI
RUN pip3 install --no-cache-dir aws-sam-cli

WORKDIR /app

# Copy project files
COPY . /app

# Ensure scripts are executable
RUN chmod +x *.sh run_agent.sh

ENTRYPOINT ["bash"]