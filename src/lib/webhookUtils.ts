/**
 * Utility to send events to n8n webhook with categorized types.
 * Type 1: Inactivity Alert (>7 days)
 * Type 2: Real-time Update (New Client / Note change)
 * Type 3: Sale Closed (Cierre)
 * Type 4: Lead Lost (Perdido)
 */
export const triggerN8nWebhook = async (type: 1 | 2 | 3 | 4, data: any) => {
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn('n8n Webhook URL not configured in .env');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: type,
        timestamp: new Date().toISOString(),
        payload: data
      }),
    });

    if (!response.ok) {
      console.error(`n8n Webhook Type ${type} failed with status ${response.status}`);
    }
  } catch (error) {
    console.error(`Error calling n8n webhook (Type ${type}):`, error);
  }
};
