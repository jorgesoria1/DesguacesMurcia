import { useEffect, useState } from 'react';

export default function TestPaymentModules() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testPaymentModules = async () => {
      try {
        console.log('TEST: Cargando módulos de pago...');
        
        const response = await fetch('/api/admin/payment-modules');
        console.log('TEST: Response status:', response.status);
        console.log('TEST: Response ok:', response.ok);
        
        const data = await response.json();
        console.log('TEST: Data received:', data);
        console.log('TEST: Data type:', typeof data);
        console.log('TEST: Is array?', Array.isArray(data));
        
        if (Array.isArray(data)) {
          console.log('TEST: Data length:', data.length);
          console.log('TEST: First module:', data[0]);
        }
        
        setResult(data);
        setLoading(false);
        
      } catch (error) {
        console.error('TEST: Error:', error);
        setResult({ error: error.message });
        setLoading(false);
      }
    };
    
    testPaymentModules();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Test Payment Modules</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Payment Modules</h1>
      
      {result && result.error ? (
        <div style={{ color: 'red' }}>
          <h2>Error!</h2>
          <p>{result.error}</p>
        </div>
      ) : Array.isArray(result) ? (
        <div style={{ color: 'green' }}>
          <h2>Success!</h2>
          <p>Modules loaded: {result.length}</p>
          <pre style={{ background: '#f0f0f0', padding: '10px', overflow: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : (
        <div style={{ color: 'orange' }}>
          <h2>Unexpected data type</h2>
          <p>Data is not an array</p>
          <pre style={{ background: '#f0f0f0', padding: '10px', overflow: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}