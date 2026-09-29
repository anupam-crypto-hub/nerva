# Nerva — Importable n8n Workflows

All 5 n8n workflow JSON files required to replace the Nerva SQS / Worker processing layer are saved in this folder:

| File | Webhook Endpoint Path | Description |
|---|---|---|
| [`01-event-processing.json`](file:///D:/workstation/workspace%203/Nerva/n8n-workflows/01-event-processing.json) | `/webhook/event-processing` | **Main router**: Receives events from `POST /v1/events`, fetches details from Nerva API, checks COD status, and dispatches MSG91 WhatsApp template. |
| [`02-conversation-processing.json`](file:///D:/workstation/workspace%203/Nerva/n8n-workflows/02-conversation-processing.json) | `/webhook/conversation-processing` | **Inbound WhatsApp Handler**: Receives customer button replies (`CONFIRM_ORDER`, `CANCEL_ORDER`, `RESCHEDULE`, etc.) and posts events back to Nerva API. |
| [`03-ndr-rescue.json`](file:///D:/workstation/workspace%203/Nerva/n8n-workflows/03-ndr-rescue.json) | `/webhook/ndr-rescue` | **NDR Rescue**: Routes delivery failure reasons (Customer Unavailable, Wrong Address, Cash Unavailable) to send targeted MSG91 WhatsApp messages. |
| [`04-workflow-execution.json`](file:///D:/workstation/workspace%203/Nerva/n8n-workflows/04-workflow-execution.json) | `/webhook/workflow-execution` | **Step Execution**: Generic listener for internal workflow step execution dispatches. |
| [`05-webhook-delivery.json`](file:///D:/workstation/workspace%203/Nerva/n8n-workflows/05-webhook-delivery.json) | `/webhook/webhook-delivery` | **Webhook Dispatch**: Receiver for outgoing webhooks meant for Jiffy / QuickFlo. |

---

## How to Import in n8n

1. Open your n8n dashboard at `http://localhost:5678/`
2. Click **Workflows** → **Import from File** (or top-right menu `...` → **Import from File**)
3. Select the JSON file (e.g. `01-event-processing.json`)
4. In the imported workflow:
   - Double-click the **HTTP Request** nodes (like `Fetch Event from Nerva` or `Nerva: POST order.confirmed`).
   - Replace `YOUR_WORKSPACE_API_KEY` in headers (`x-api-key`) with your actual Nerva API Key.
5. Click **Save** and **Activate** (toggle top-right switch to Active).

---

## Testing the Flow

1. Trigger an event on Nerva API:
   ```bash
   curl -X POST http://localhost:5010/v1/events \
     -H "x-api-key: <your_workspace_api_key>" \
     -H "Content-Type: application/json" \
     -d '{
       "event_id": "evt_test_001",
       "type": "order.created",
       "occurred_at": "2026-09-02T10:00:00Z",
       "data": {
         "customer": { "phone": "919876543210", "name": "Test User" },
         "order": { "order_number": "JIF-1001", "payment_method": "COD", "total_amount": 1499 }
       }
     }'
   ```

2. Check n8n **Executions**:
   - `01-event-processing` workflow will trigger automatically via the `/webhook/event-processing` endpoint.
   - It fetches event details from Nerva and sends the MSG91 WhatsApp confirmation template.
