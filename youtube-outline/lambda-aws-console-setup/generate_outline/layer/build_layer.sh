#!/bin/bash
set -e

# Build the Docker image
docker build -t lambda-layer-builder .

# Create a container and copy the layer.zip
docker create --name temp-container lambda-layer-builder
docker cp temp-container:/opt/layer.zip ./generate_outline_layer.zip

# Cleanup
docker rm temp-container
