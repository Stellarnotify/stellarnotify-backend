# Webhook Signature Verification

StellarNotify signs webhook payloads using HMAC-SHA256 to ensure authenticity and prevent spoofing attacks.

## How It Works

1. When creating a subscription with `channel: "Webhook"`, optionally provide a `webhookSecret` field containing a secure random string (recommended: 32+ characters).
2. For each webhook delivery, StellarNotify computes an HMAC-SHA256 signature of the JSON payload using your secret.
3. The signature is included in the `X-StellarNotify-Signature` header as a hex-encoded string.
4. Your endpoint should verify the signature before processing the payload.

## Verification Example (Node.js)

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express.js example
app.post('/webhook', express.json(), (req, res) => {
  const signature = req.headers['x-stellarnotify-signature'];
  const secret = process.env.WEBHOOK_SECRET;
  
  if (!signature || !verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process valid webhook
  console.log('Valid webhook received:', req.body);
  res.status(200).json({ received: true });
});
```

## Verification Example (Python)

```python
import hmac
import hashlib
import json

def verify_webhook_signature(payload: dict, signature: str, secret: str) -> bool:
    payload_string = json.dumps(payload, separators=(',', ':'))
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)

# Flask example
from flask import Flask, request, jsonify

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-StellarNotify-Signature')
    secret = os.environ['WEBHOOK_SECRET']
    payload = request.get_json()
    
    if not signature or not verify_webhook_signature(payload, signature, secret):
        return jsonify({'error': 'Invalid signature'}), 401
    
    # Process valid webhook
    print('Valid webhook received:', payload)
    return jsonify({'received': True})
```

## Security Best Practices

1. **Generate a strong secret**: Use a cryptographically secure random string (32+ characters)
2. **Keep secrets secure**: Store webhook secrets in environment variables or secret management systems
3. **Use timing-safe comparison**: Always use `crypto.timingSafeEqual()` or `hmac.compare_digest()` to prevent timing attacks
4. **Rotate secrets periodically**: Update your webhook secret regularly and update the subscription
5. **Verify JSON serialization**: Ensure your JSON serialization matches the format StellarNotify uses (no extra whitespace)

## Optional Feature

Signature verification is **optional**. If you don't provide a `webhookSecret` when creating a subscription, no signature will be included in the `X-StellarNotify-Signature` header.

However, for production environments, we **strongly recommend** enabling signature verification to prevent unauthorized requests to your endpoints.
