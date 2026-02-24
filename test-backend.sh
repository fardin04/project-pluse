#!/bin/bash

echo "Testing backend endpoints..."
echo ""

echo "1. Testing /health endpoint:"
curl -s https://project-pluse.onrender.com/health
echo ""
echo ""

echo "2. Testing /api/health endpoint:"
curl -s https://project-pluse.onrender.com/api/health | jq .
echo ""
echo ""

echo "If you see 'OK' and a JSON response with 'status: ok', your backend is working!"
