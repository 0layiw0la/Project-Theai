export const config = {
  api: {
    bodyParser: false, // Disable body parsing for multipart data
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Create a new FormData object to forward to backend
    const FormData = require('form-data');
    const formData = new FormData();

    // Get the raw body as buffer
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Parse multipart data manually or forward raw
    const response = await fetch('http://34.45.203.244:8000/upload', {
      method: 'POST',
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': req.headers['content-type'], // Forward the content-type with boundary
      },
      body: buffer // Forward raw multipart body
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Upload proxy error:', error);
    return res.status(500).json({ error: 'Upload failed' });
  }
}