#!/bin/bash

# Script to display VAPID keys for Vercel environment variables
# Run this and copy the keys to Vercel dashboard

echo "========================================="
echo "VAPID Keys for Vercel Environment Variables"
echo "========================================="
echo ""
echo "Copy these EXACT values to Vercel:"
echo ""

# Read from .env.local
PUBLIC_KEY=$(grep "NEXT_PUBLIC_VAPID_PUBLIC_KEY" .env.local | cut -d'=' -f2 | tr -d '"')
PRIVATE_KEY=$(grep "VAPID_PRIVATE_KEY" .env.local | cut -d'=' -f2 | tr -d '"')

echo "1. NEXT_PUBLIC_VAPID_PUBLIC_KEY"
echo "   Value: $PUBLIC_KEY"
echo ""
echo "2. VAPID_PRIVATE_KEY  "
echo "   Value: $PRIVATE_KEY"
echo ""
echo "========================================="
echo ""
echo "Steps to update on Vercel:"
echo "1. Go to https://vercel.com/vs-projects-c6c85555/student-os/settings/environment-variables"
echo "2. Find NEXT_PUBLIC_VAPID_PUBLIC_KEY and click Edit"
echo "3. Paste the public key value above"
echo "4. Find VAPID_PRIVATE_KEY and click Edit"
echo "5. Paste the private key value above"
echo "6. Click Save"
echo "7. Redeploy the application"
echo ""
echo "========================================="
