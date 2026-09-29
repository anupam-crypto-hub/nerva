param(
    [string]$ApiKey = $env:NERVA_API_KEY
)

if (-not $ApiKey -and (Test-Path "$PSScriptRoot\.env")) {
    Get-Content "$PSScriptRoot\.env" | ForEach-Object {
        if ($_ -match '^\s*NERVA_API_KEY\s*=\s*(.+)$') {
            $ApiKey = $Matches[1].Trim()
        }
    }
}
if (-not $ApiKey) {
    $ApiKey = "YOUR_WORKSPACE_API_KEY"
}
$API_KEY = $ApiKey
$BASE = "http://localhost:5010/v1"

$pass = 0
$fail = 0
$lines = @()

function Run-Test {
    param([string]$Method, [string]$Url, [string]$Label, [string]$Body, [switch]$NoAuth)
    
    $args_list = @("-s", "-w", "`nHTTP_CODE:%{http_code}", "-X", $Method, $Url)
    
    if (-not $NoAuth) {
        $args_list += @("-H", "x-api-key: $script:API_KEY")
    }
    $args_list += @("-H", "Content-Type: application/json")
    
    if ($Body) {
        $args_list += @("-d", $Body)
    }
    
    $output = & curl.exe @args_list 2>&1 | Out-String
    
    $code = 0
    if ($output -match "HTTP_CODE:(\d+)") {
        $code = [int]$Matches[1]
    }
    
    $bodyResp = ($output -replace "`nHTTP_CODE:\d+", "").Trim()
    $short = if ($bodyResp.Length -gt 120) { $bodyResp.Substring(0,120) + "..." } else { $bodyResp }
    
    if ($code -ge 200 -and $code -lt 300) {
        $script:pass++
        $status = "PASS"
        Write-Host "PASS  $code  $Method $Label"
    } elseif ($code -eq 404) {
        $script:pass++
        $status = "PASS(404)"
        Write-Host "PASS  $code  $Method $Label  (no data)"
    } else {
        $script:fail++
        $status = "FAIL"
        Write-Host "FAIL  $code  $Method $Label  => $short"
    }
    
    $script:lines += "$status|$code|$Method|$Label|$short"
}

Write-Host ""
Write-Host "========================================"
Write-Host "   NERVA API - Full Endpoint Test"
Write-Host "   $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "========================================"

# --- AUTH ---
Write-Host "`n--- AUTH ---"
Run-Test -Method GET -Url "$BASE/auth/api-keys" -Label "/auth/api-keys (list)"

# --- EVENTS ---
Write-Host "`n--- EVENTS ---"
Run-Test -Method POST -Url "$BASE/events" -Label "/events (order.created)" -Body '{"event_id":"evt_rpt_001","type":"order.created","occurred_at":"2026-09-03T12:00:00Z","data":{"customer":{"id":"cust_001","name":"Rahul Sharma","phone":"919876543210","email":"rahul@test.com"},"order":{"id":"ord_001","order_number":"JIF-2001","payment_method":"COD","total_amount":1499,"status":"CREATED","currency":"INR"}}}'

Run-Test -Method POST -Url "$BASE/events" -Label "/events (shipment.created)" -Body '{"event_id":"evt_rpt_002","type":"shipment.created","occurred_at":"2026-09-03T12:01:00Z","data":{"customer":{"id":"cust_001","name":"Rahul Sharma","phone":"919876543210"},"order":{"id":"ord_001","order_number":"JIF-2001"},"shipment":{"id":"shp_001","tracking_number":"TRACK123456","courier":"delhivery","status":"CREATED"}}}'

Run-Test -Method POST -Url "$BASE/events" -Label "/events (ndr.created)" -Body '{"event_id":"evt_rpt_003","type":"ndr.created","occurred_at":"2026-09-03T12:02:00Z","data":{"customer":{"id":"cust_001","name":"Rahul Sharma","phone":"919876543210"},"order":{"id":"ord_001","order_number":"JIF-2001"},"ndr":{"shipment_id":"shp_001","reason":"customer_unavailable","attempt_number":1,"status":"ACTION_REQUIRED"}}}'

Run-Test -Method POST -Url "$BASE/events" -Label "/events (address.verified)" -Body '{"event_id":"evt_rpt_004","type":"address.verified","occurred_at":"2026-09-03T12:03:00Z","data":{"customer":{"id":"cust_001","name":"Rahul Sharma","phone":"919876543210"},"order":{"id":"ord_001","order_number":"JIF-2001"}}}'

Run-Test -Method POST -Url "$BASE/events" -Label "/events (order.confirmed)" -Body '{"event_id":"evt_rpt_005","type":"order.confirmed","occurred_at":"2026-09-03T12:04:00Z","data":{"customer":{"id":"cust_001","phone":"919876543210"},"order":{"id":"ord_001","order_number":"JIF-2001","status":"CONFIRMED"}}}'

Run-Test -Method POST -Url "$BASE/events" -Label "/events (order.cancelled)" -Body '{"event_id":"evt_rpt_006","type":"order.cancelled","occurred_at":"2026-09-03T12:05:00Z","data":{"customer":{"id":"cust_002","phone":"919876543211"},"order":{"id":"ord_002","order_number":"JIF-2002","status":"CANCELLED","cancellation_reason":"customer_request"}}}'

Run-Test -Method GET -Url "$BASE/events/000000000000000000000001" -Label "/events/:id"

# --- CUSTOMERS ---
Write-Host "`n--- CUSTOMERS ---"
Run-Test -Method GET -Url "$BASE/customers/000000000000000000000001" -Label "/customers/:id"

# --- ORDERS ---
Write-Host "`n--- ORDERS ---"
Run-Test -Method GET -Url "$BASE/orders/000000000000000000000001" -Label "/orders/:id"

# --- SHIPMENTS ---
Write-Host "`n--- SHIPMENTS ---"
Run-Test -Method GET -Url "$BASE/shipments/000000000000000000000001" -Label "/shipments/:id"

# --- NDR ---
Write-Host "`n--- NDR ---"
Run-Test -Method GET -Url "$BASE/ndrs/000000000000000000000001" -Label "/ndrs/:id"

# --- WORKFLOWS ---
Write-Host "`n--- WORKFLOWS ---"
Run-Test -Method GET -Url "$BASE/workflows" -Label "/workflows (list)"

# --- EXECUTIONS ---
Write-Host "`n--- EXECUTIONS ---"
Run-Test -Method GET -Url "$BASE/executions/000000000000000000000001" -Label "/executions/:id"

# --- TEMPLATES ---
Write-Host "`n--- TEMPLATES ---"
Run-Test -Method GET -Url "$BASE/templates" -Label "/templates (list)"
Run-Test -Method POST -Url "$BASE/templates" -Label "/templates (create)" -Body '{"name":"test_tpl_001","channel":"whatsapp","provider":"msg91","externalTemplateId":"ext_001","language":"en","category":"UTILITY","content":{"body":"Hi {{1}}, your order {{2}} is confirmed."}}'

# --- MESSAGES ---
Write-Host "`n--- MESSAGES ---"
Run-Test -Method GET -Url "$BASE/messages/000000000000000000000001" -Label "/messages/:id"

# --- CONVERSATIONS ---
Write-Host "`n--- CONVERSATIONS ---"
Run-Test -Method GET -Url "$BASE/conversations/000000000000000000000001" -Label "/conversations/:id"
Run-Test -Method GET -Url "$BASE/customers/000000000000000000000001/conversations" -Label "/customers/:id/conversations"

# --- WEBHOOKS (outbound) ---
Write-Host "`n--- WEBHOOKS (outbound config) ---"
Run-Test -Method GET -Url "$BASE/webhooks" -Label "/webhooks (list)"
Run-Test -Method POST -Url "$BASE/webhooks" -Label "/webhooks (create)" -Body '{"url":"https://api.jiffy.com/nerva/callback","events":["order.confirmed","ndr.resolved"],"secret":"whsec_test_123"}'

# --- WHATSAPP INBOUND (no auth) ---
Write-Host "`n--- WHATSAPP WEBHOOKS (MSG91, no auth) ---"
Run-Test -Method POST -Url "$BASE/webhooks/whatsapp/inbound" -Label "/webhooks/whatsapp/inbound (button)" -Body '{"direction":"inbound","message_type":"interactive","customer_number":"919876543210","integrated_number":"918890921925","message_uuid":"msg_rpt_001","interactive":{"type":"button_reply","button_reply":{"id":"CONFIRM_ORDER","title":"Confirm Order"}}}' -NoAuth

Run-Test -Method POST -Url "$BASE/webhooks/whatsapp/status" -Label "/webhooks/whatsapp/status (DLR)" -Body '{"direction":"outbound","status":"Delivered","customer_number":"919876543210","integrated_number":"918890921925","message_uuid":"msg_dlr_001","message_type":"template","template_name":"cod_order_confirmation"}' -NoAuth

# --- SWAGGER ---
Write-Host "`n--- SWAGGER ---"
Run-Test -Method GET -Url "http://localhost:5010/docs" -Label "/docs (Swagger UI)" -NoAuth

# === FINAL SUMMARY ===
Write-Host ""
Write-Host "========================================"
Write-Host "   SUMMARY: Total=$($pass+$fail)  Pass=$pass  Fail=$fail"
Write-Host "========================================"
Write-Host ""

foreach ($line in $lines) {
    $parts = $line.Split("|")
    $s = $parts[0].PadRight(10)
    $c = $parts[1].PadRight(5)
    $m = $parts[2].PadRight(6)
    $e = $parts[3]
    Write-Host "$s $c $m $e"
}
