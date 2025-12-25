import requests
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class VerificationRequest:
    providerId: str
    countryCode: str
    firstName: str
    lastName: str
    licenseNumber: str
    dateOfBirth: Optional[str] = None

@dataclass
class VerificationResult:
    transactionId: str
    status: str
    method: str
    confidenceScore: float
    verifiedAt: str
    details: Dict[str, Any] = field(default_factory=dict)

@dataclass
class BatchVerificationResult:
    batchId: str
    total: int
    processed: int
    results: List[Dict[str, Any]]
    startedAt: str
    completedAt: str

class VeriMedError(Exception):
    def __init__(self, message: str, status_code: int, response: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response

class VeriMedClient:
    """
    VeriMed Python SDK
    
    Official client for VeriMed Medical Provider Verification API.
    """
    
    def __init__(self, base_url: str, api_key: str, timeout: int = 30):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        self.headers = {
            'Content-Type': 'application/json',
            'x-api-key': self.api_key
        }

    def _request(self, method: str, path: str, json: Any = None) -> Any:
        url = f"{self.base_url}{path}"
        try:
            response = requests.request(
                method, 
                url, 
                headers=self.headers, 
                json=json, 
                timeout=self.timeout
            )
            
            if not response.ok:
                try:
                    error_data = response.json()
                    message = error_data.get('message', f'HTTP {response.status_code}')
                except:
                    message = f'HTTP {response.status_code}'
                raise VeriMedError(message, response.status_code, response.text)
            
            return response.json()
        except requests.exceptions.RequestException as e:
            raise VeriMedError(str(e), 0)

    def verify(self, request: VerificationRequest) -> VerificationResult:
        """Verify a healthcare provider"""
        data = {
            'providerId': request.providerId,
            'countryCode': request.countryCode,
            'firstName': request.firstName,
            'lastName': request.lastName,
            'licenseNumber': request.licenseNumber,
        }
        if request.dateOfBirth:
            data['dateOfBirth'] = request.dateOfBirth
            
        res = self._request('POST', '/v1/verify', json=data)
        return VerificationResult(**res)

    def verify_batch(self, providers: List[VerificationRequest]) -> BatchVerificationResult:
        """Verify multiple providers (Enterprise)"""
        data = {
            'providers': [
                {
                    'providerId': p.providerId,
                    'countryCode': p.countryCode,
                    'firstName': p.firstName,
                    'lastName': p.lastName,
                    'licenseNumber': p.licenseNumber,
                    **({'dateOfBirth': p.dateOfBirth} if p.dateOfBirth else {})
                } for p in providers
            ]
        }
        res = self._request('POST', '/v1/verify/batch', json=data)
        return BatchVerificationResult(**res)

    def get_verification(self, transaction_id: str) -> VerificationResult:
        """Get status of a previous verification"""
        res = self._request('GET', f'/v1/verify/{transaction_id}')
        return VerificationResult(**res)

    def health(self) -> Dict[str, Any]:
        """Check API health"""
        return self._request('GET', '/health')

    def get_supported_countries(self) -> List[Dict[str, str]]:
        """Get list of supported countries"""
        return [
            {'code': 'US', 'name': 'USA', 'registry': 'NPI (NPPES)', 'apiStatus': 'full'},
            {'code': 'FR', 'name': 'France', 'registry': 'ANS (RPPS)', 'apiStatus': 'full'},
            {'code': 'AE', 'name': 'UAE', 'registry': 'DHA', 'apiStatus': 'full'},
            {'code': 'NL', 'name': 'Netherlands', 'registry': 'BIG-register', 'apiStatus': 'full'},
            {'code': 'IL', 'name': 'Israel', 'registry': 'MOH', 'apiStatus': 'full'},
            {'code': 'GB', 'name': 'UK', 'registry': 'GMC', 'apiStatus': 'manual_review'},
            {'code': 'CA', 'name': 'Canada', 'registry': 'Provincial Colleges', 'apiStatus': 'manual_review'},
            {'code': 'AU', 'name': 'Australia', 'registry': 'AHPRA', 'apiStatus': 'manual_review'},
            {'code': 'DE', 'name': 'Germany', 'registry': 'Bundesärztekammer', apiStatus: 'manual_review'},
            {'code': 'ZA', 'name': 'South Africa', 'registry': 'HPCSA', 'apiStatus': 'manual_review'},
            {'code': 'BR', 'name': 'Brazil', 'registry': 'CFM', 'apiStatus': 'manual_review'},
        ]
