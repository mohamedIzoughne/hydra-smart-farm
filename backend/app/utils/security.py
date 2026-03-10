import bleach
import re
import os
from flask import request, jsonify
from functools import wraps
from pydantic import ValidationError
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Initialize Rate Limiter
# Using more generous limits for dev/local but keeping it for OWASP compliance
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["3000 per day", "300 per hour"],
    storage_uri="memory://"
)

def apply_security_headers(response):
    """
    Applies OWASP Recommended Security Headers to every response.
    """
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' localhost:5000;"
    
    if 'Server' in response.headers:
        del response.headers['Server']
        
    return response

def sanitize_content(value):
    """
    Recursively sanitizes input dictionaries or lists using Bleach to prevent XSS.
    """
    if isinstance(value, str):
        return bleach.clean(value, tags=[], attributes={}, strip=True)
    elif isinstance(value, dict):
        return {k: sanitize_content(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [sanitize_content(v) for v in value]
    return value

def validate_schema(schema_class):
    """
    Decorator to validate request JSON against a Pydantic schema class.
    Injects the validated model as 'validated_data' in the route.
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if not request.is_json:
                return jsonify({"error": "Content-Type must be application/json"}), 415
            
            # Use already sanitized JSON from before_request hook if possible
            raw_data = getattr(request, '_cached_json', None)
            
            # Flask/Werkzeug version compatibility check
            if isinstance(raw_data, tuple) and len(raw_data) >= 1:
                data = raw_data[0]
            else:
                data = raw_data if raw_data is not None else (request.get_json(silent=True) or {})

            try:
                validated_model = schema_class(**data)
                kwargs['validated_data'] = validated_model
                return f(*args, **kwargs)
            except ValidationError as e:
                return jsonify({
                    "error": "Validation failed (OWASP Security)",
                    "details": e.errors()
                }), 422
        return wrapper
    return decorator

def owasp_input_validation(app):
    """
    Global before_request hook for request size and cross-cutting sanitization.
    """
    @app.before_request
    def validate_request():
        # OWASP: Prevent oversized requests (DoS)
        if request.content_length and request.content_length > 1024 * 1024:
            return jsonify({"error": "Payload too large (OWASP Security)"}), 413
            
        if request.is_json:
            try:
                data = request.get_json(silent=True)
                if data:
                    if not isinstance(data, (dict, list)):
                        return jsonify({"error": "Invalid JSON structure"}), 400
                    
                    # Pre-sanitize everything to prevent stored XSS
                    sanitized = sanitize_content(data)
                    # For Werkzeug/Flask 3.x internals
                    request._cached_json = (sanitized, sanitized)
            except Exception:
                return jsonify({"error": "Malformed JSON"}), 400

    @app.after_request
    def after_request(response):
        return apply_security_headers(response)
