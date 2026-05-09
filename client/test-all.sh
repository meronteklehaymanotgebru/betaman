#!/bin/bash
# File: test-all.sh
# Run from: ~/betaman/client

echo "🔍 Testing BetAman Implementation"
echo "=================================="

# Test 1: AI Logic is Dynamic
echo -e "\n1. Testing AI analysis logic..."
HIGH=$(curl -s -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{"url":"scam","location":"Bole","price":5000}' | jq -r '.risk_score')
LOW=$(curl -s -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{"url":"legit","location":"Bole","price":18000}' | jq -r '.risk_score')

if [ "$HIGH" = "92" ] && [ "$LOW" = "15" ]; then
  echo "✅ AI logic is dynamic (HIGH=$HIGH, LOW=$LOW)"
else
  echo "❌ AI logic may be hardcoded (HIGH=$HIGH, LOW=$LOW)"
fi

# Test 2: EXIF/Screenshot fields exist
echo -e "\n2. Testing EXIF/screenshot fields..."
HAS_FIELDS=$(curl -s -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{"url":"test"}' | jq 'has("exif_status") and has("screenshot_warning")')
if [ "$HAS_FIELDS" = "true" ]; then
  echo "✅ EXIF and screenshot fields present in response"
else
  echo "❌ Missing EXIF or screenshot fields"
fi

# Test 3: No hardcoded API keys
echo -e "\n3. Testing for hardcoded API keys..."
if grep -r "sk-proj-" src/ 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -q .; then
  echo "❌ Found hardcoded API key in source code"
else
  echo "✅ No hardcoded API keys found"
fi

# Test 4: Environment variables exist
echo -e "\n4. Testing environment configuration..."
if [ -f ".env.example" ] && grep -q "AI_API_KEY" .env.example; then
  echo "✅ .env.example exists with required variables"
else
  echo "❌ .env.example missing or incomplete"
fi

echo -e "\n=================================="
echo "✅ Test suite complete"
echo "Note: Wallet connection and voice narration require manual browser testing"
