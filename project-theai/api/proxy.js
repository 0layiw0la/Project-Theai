export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { endpoint } = req.query;
  
  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint parameter required' });
  }

  try {
    const backendUrl = `http://34.45.203.244:8000/${endpoint}`;
    
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Add authorization header if present
    if (req.headers.authorization) {
      fetchOptions.headers['Authorization'] = req.headers.authorization;
    }

    // Handle POST/PUT body correctly
    if ((req.method === 'POST' || req.method === 'PUT')) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    console.log('Proxying to:', backendUrl);
    console.log('Request body:', req.body);
    console.log('Fetch options:', fetchOptions);

    const response = await fetch(backendUrl, fetchOptions);
    const responseText = await response.text();
    
    console.log('Backend response status:', response.status);
    console.log('Backend response:', responseText);
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(responseText);
      return res.status(response.status).json(data);
    } catch (parseError) {
      return res.status(502).json({ 
        error: 'Backend returned non-JSON', 
        response: responseText 
      });
    }
    
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: 'Proxy request failed', 
      details: error.message
    });
  }
}