FROM amazonlinux:2023

# Install Python 3.11 and zip
RUN dnf install -y python3.11 python3.11-pip zip

# Copy requirements file
COPY requirements.txt .

# Create the directory structure required for Lambda layers
RUN mkdir -p /opt/python/lib/python3.11/site-packages

# Install dependencies into the correct directory with platform specification
RUN python3.11 -m pip install --platform manylinux2014_x86_64 --only-binary=:all: -r requirements.txt -t /opt/python/lib/python3.11/site-packages/

# Create the layer archive with the correct structure
RUN cd /opt && zip -r layer.zip python/
