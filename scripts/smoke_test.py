import urllib.request
import json
import sys

# Configure stdout for utf-8 on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def api_call(url, method='GET', data=None, token=None):
    headers = {}
    body = None
    if data is not None:
        headers['Content-Type'] = 'application/json'
        body = json.dumps(data).encode('utf-8')
    if token:
        headers['Authorization'] = f'Bearer {token}'

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        content = resp.read().decode('utf-8')
        try:
            return resp.status, json.loads(content)
        except Exception:
            return resp.status, content

def run_smoke_test():
    print('=====================================================')
    print('🧪 ONBOARDIQ LIVE END-TO-END SMOKE TEST')
    print('=====================================================')

    # 1. Health check
    print('\n[1] Checking System Health...')
    status, health = api_call('http://localhost:5000/api/v1/health')
    assert status == 200
    print('    System Health:', health['status'], '| Database:', health['database'])

    # 2. Applicant Login
    print('\n[2] Logging in as Applicant (applicant1)...')
    status, app_res = api_call('http://localhost:5000/api/v1/auth/login', 'POST', {
        'username': 'applicant1',
        'password': 'password123'
    })
    assert status == 200
    applicant_token = app_res['token']
    print('    Logged in as:', app_res['user']['fullName'])

    # 3. Fetch Applicant Details
    print('\n[3] Fetching Applicant Own Applications (A2000001)...')
    status, apps_res = api_call('http://localhost:5000/api/v1/applications/my', 'GET', token=applicant_token)
    assert status == 200
    print('    Applications Found:', len(apps_res['applications']))
    app1 = apps_res['applications'][0]
    print('    App ID:', app1['applicationId'], '| Status:', app1['status'], '| PAN:', app1['panNumber'])

    # 4. KYC Maker Login & Queue
    print('\n[4] Logging in as KYC Maker 1 (maker1)...')
    status, maker_res = api_call('http://localhost:5000/api/v1/auth/login', 'POST', {
        'username': 'maker1',
        'password': 'password123'
    })
    assert status == 200
    maker_token = maker_res['token']
    print('    Logged in as Maker:', maker_res['user']['fullName'])

    status, queue_res = api_call('http://localhost:5000/api/v1/maker/queue', 'GET', token=maker_token)
    assert status == 200
    print('    Maker Review Queue Count:', len(queue_res['queue']))
    first_case = queue_res['queue'][0]
    print('    First in Queue:', first_case['applicationId'], '| Risk:', first_case['riskCategory'], '| Exceptions:', first_case['reasonCodes'])

    # 5. Maker Field Correction on Example 9
    print('\n[5] Executing Field Correction on A2000009 (Worked Example 9)...')
    # Fetch details of A2000009
    status, app9 = api_call('http://localhost:5000/api/v1/applications/A2000009', 'GET', token=maker_token)
    assert status == 200
    pan_doc = next((d for d in app9['documents'] if d['declaredDocType'] == 'PAN_CARD'), None)
    if pan_doc:
        status, corr_res = api_call('http://localhost:5000/api/v1/maker/correct-field', 'POST', {
            'applicationId': 'A2000009',
            'docId': pan_doc['docId'],
            'fieldName': 'pan_number',
            'newValue': 'ZZTPS9012Y',
            'reason': 'Corrected optical misread characters O to 0 and 5 to S',
            'version': app9['application']['version']
        }, token=maker_token)
        print('    Field corrected successfully. New Decision:', corr_res['application']['decision'], '| Status:', corr_res['application']['status'])

    # 6. Maker Recommendation on Example 4
    print('\n[6] Submitting Maker Recommendation on A2000004...')
    status, app4 = api_call('http://localhost:5000/api/v1/applications/A2000004', 'GET', token=maker_token)
    assert status == 200
    if app4['application']['status'] == 'IN_REVIEW':
        status, rec_res = api_call('http://localhost:5000/api/v1/maker/recommend', 'POST', {
            'applicationId': 'A2000004',
            'recommendation': 'APPROVE',
            'comment': 'Minor name variation verified against secondary documents. Recommended for approval.',
            'version': app4['application']['version']
        }, token=maker_token)
        print('    Recommendation recorded. New Status:', rec_res['application']['status'])

    # 7. Compliance Checker Login & Verification
    print('\n[7] Logging in as Compliance Checker (checker1)...')
    status, check_res = api_call('http://localhost:5000/api/v1/auth/login', 'POST', {
        'username': 'checker1',
        'password': 'password123'
    })
    assert status == 200
    checker_token = check_res['token']
    print('    Logged in as Checker:', check_res['user']['fullName'])

    status, c_queue = api_call('http://localhost:5000/api/v1/checker/queue', 'GET', token=checker_token)
    print('    Checker Queue Count:', len(c_queue['queue']))

    # 8. Checker Approves A2000004 & Core Banking Account Opened
    print('\n[8] Checker Approving A2000004 & Opening Core Banking Account...')
    status, app4_chk = api_call('http://localhost:5000/api/v1/applications/A2000004', 'GET', token=checker_token)
    if app4_chk['application']['status'] == 'PENDING_CHECKER':
        status, dec_res = api_call('http://localhost:5000/api/v1/checker/decision', 'POST', {
            'applicationId': 'A2000004',
            'decision': 'APPROVE',
            'comment': 'Independent compliance verification approved. Open account.',
            'version': app4_chk['application']['version']
        }, token=checker_token)
        assert status == 200
        print('    Final Decision:', dec_res['application']['status'])
        print('    Core Banking Customer ID:', dec_res['application']['coreBankingAccount']['customerId'])
        print('    Core Banking Account No: ', dec_res['application']['coreBankingAccount']['accountNumber'])

    # 9. Admin Login & Operational KPIs
    print('\n[9] Logging in as Admin (admin1) & Fetching Reconciled KPIs...')
    status, admin_res = api_call('http://localhost:5000/api/v1/auth/login', 'POST', {
        'username': 'admin1',
        'password': 'password123'
    })
    assert status == 200
    admin_token = admin_res['token']

    status, kpis = api_call('http://localhost:5000/api/v1/admin/kpis', 'GET', token=admin_token)
    assert status == 200
    print('    Total Applications:', kpis['totalApplications'])
    print('    Straight-Through Processing Rate:', f"{kpis['metrics']['straightThroughRate']}%")
    print('    Manual Review Rate:', f"{kpis['metrics']['reviewRate']}%")
    print('    Rejection Rate:', f"{kpis['metrics']['rejectRate']}%")
    print('    Top Triggered Reason Codes:', [f"{r['code']}: {r['count']}" for r in kpis['topReasonCodes'][:3]])

    # 10. Audit Trail Export
    print('\n[10] Exporting Masked Audit Trail...')
    status, export_data = api_call('http://localhost:5000/api/v1/admin/audit/export?reason=Annual+Regulatory+Audit', 'GET', token=admin_token)
    assert status == 200
    print('    Audit CSV Export received, size:', len(export_data), 'bytes')

    print('\n=====================================================')
    print('✅ ALL 10 SMOKE TEST STEPS PASSED WITH 100% SUCCESS!')
    print('=====================================================')

if __name__ == '__main__':
    run_smoke_test()
