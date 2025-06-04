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
    console.log('🔧 Proxying to:', backendUrl);
    console.log('🔧 Method:', req.method);
    console.log('🔧 Content-Type:', req.headers['content-type']);

    // ✅ Handle FormData uploads differently
    if (req.method === 'POST' && req.headers['content-type']?.includes('multipart/form-data')) {
      
      console.log('🔧 Handling multipart FormData upload');
      
      // ✅ For FormData: Forward the raw request stream
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          // ✅ Forward Authorization header
          'Authorization': req.headers.authorization,
          // ✅ Forward the exact Content-Type with boundary
          'Content-Type': req.headers['content-type']
        },
        // ✅ Forward the raw body stream
        body: req,
        duplex: 'half' // Required for streaming request body
      });

      const responseText = await response.text();
      console.log('🔧 Backend response status:', response.status);
      console.log('🔧 Backend response preview:', responseText.substring(0, 200));
      
      try {
        const data = JSON.parse(responseText);
        return res.status(response.status).json(data);
      } catch (parseError) {
        return res.status(502).json({ 
          error: 'Backend returned non-JSON', 
          response: responseText 
        });
      }
      
    } else {
      // ✅ Handle regular JSON requests
      const fetchOptions = {
        method: req.method,
        headers: {
          ...req.headers,
          host: undefined
        },
        body: req.method === 'GET' ? undefined : JSON.stringify(req.body)
      };

      const response = await fetch(backendUrl, fetchOptions);
      const responseText = await response.text();
      
      try {
        const data = JSON.parse(responseText);
        return res.status(response.status).json(data);
      } catch (parseError) {
        return res.status(502).json({ 
          error: 'Backend returned non-JSON', 
          response: responseText 
        });
      }
    }
    
  } catch (error) {
    console.error('🔧 Proxy error:', error);
    return res.status(500).json({ 
      error: 'Proxy request failed', 
      details: error.message
    });
  }
}

// ✅ CRITICAL: Disable body parser to get raw stream
export const config = {
  api: {
    bodyParser: false,
  },
};