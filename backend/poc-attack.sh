#!/bin/bash
# 1340 Challenge Step 1: Proof of Concept Spoofing Attack
# This script attempts to bypass the frontend and modify the database via the backend API.

echo "Executing spoof attack without a token..."
curl -X POST http://localhost:3001/api/saveItinerary \
  -H "Content-Type: application/json" \
  -d '{
        "userId": "hacker_user_123",
        "activitiesByDate": {
            "10/31/2026": [{"id": "hacked_1", "name": "Fake Activity Injected via Spoof"}]
        }
      }'

echo -e "\n\nIf the backend returns a 401 Unauthorized, the Step 2 mitigation was successful!"
