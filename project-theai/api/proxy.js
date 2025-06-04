export default async function handler(req, res) {
  const { endpoint } = req.query;
  
  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint parameter required' });
  }

  try {
    const backendUrl = `http://34.45.203.244:8000/${endpoint}`;
    
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization && { 
          'Authorization': req.headers.authorization 
        })
      }
    };

    if (req.method !== 'GET' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(backendUrl, fetchOptions);
    const data = await response.json();
    
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Proxy request failed' });
  }
}