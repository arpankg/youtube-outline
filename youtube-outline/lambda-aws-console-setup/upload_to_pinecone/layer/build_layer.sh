#!/bin/bash
set -e

# Build the Docker image
docker build -t pinecone-lambda-layer-builder .

# Create a container and copy the layer.zip
docker create --name temp-container pinecone-lambda-layer-builder
docker cp temp-container:/opt/layer.zip ./pinecone_uploader_layer.zip

# Cleanup
docker rm temp-container