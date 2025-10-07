#!/bin/bash
# Replit Production Deployment Script
# This script is specifically designed for Replit deployment without 'dev' references

echo "Starting Replit Production Deployment..."
export NODE_ENV=production
export PORT=5000

# Start the production server
exec node production-start.js