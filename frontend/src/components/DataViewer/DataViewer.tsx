import React, { useState } from 'react';

export function DataViewer() {
  const [source, setSource] = useState('csv');
  const [filename, setFilename] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [countyCode, setCountyCode] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState('');

  const handleFetch = async () => {
    setError('');
    setData([]);

    try {
      let url = '';
      
      if (source === 'csv') {
        if (!filename) {
          setError('Please provide a filename for the CSV.');
          return;
        }
        // Hits the /getcsv endpoint from server.ts
        url = `http://localhost:3001/getcsv?filepath=${filename}`;
      } else if (source === 'fbi') {
        // Hits the /arrests endpoint from server.ts
        url = 'http://localhost:3001/arrests'; 
      } else if (source === 'acs') {
        if (!stateCode || !countyCode) {
          setError('Please provide state and county names for ACS data.');
          return;
        }
        // Hits the /acs endpoint from server.ts
        url = `http://localhost:3001/acs?state=${stateCode}&county=${countyCode}`;
      }

      const response = await fetch(url);
      const json = await response.json();

      if (json.result === 'error' || json.result === 'error_bad_request') {
        setError(json.error_message || json.error_type || 'Error fetching data from server');
      } else {
        // Normalize the response into an array for the table
        let parsedData = json.data || json;
        if (!Array.isArray(parsedData)) {
          parsedData = [parsedData];
        }
        setData(parsedData);
      }
    } catch (err) {
      setError('Failed to connect to the backend server. Is it running?');
    }
  };

  return (
    <div style={{ padding: '1rem', borderTop: '1px solid #ccc', marginTop: '1rem' }}>
      <h3>Raw Data Inspector</h3>
      
      <div style={{ marginBottom: '1rem' }}>
        <select value={source} onChange={(e) => setSource(e.target.value)} style={{ width: '100%', padding: '4px' }}>
          <option value="csv">CSV Data</option>
          <option value="fbi">FBI Data</option>
          <option value="acs">ACS Data</option>
        </select>
      </div>

      {source === 'csv' && (
        <div style={{ marginBottom: '1rem' }}>
          <input 
            type="text" 
            placeholder="Enter CSV filepath (e.g., data/people.csv)" 
            value={filename} 
            onChange={(e) => setFilename(e.target.value)} 
            style={{ width: '100%', padding: '4px' }}
          />
        </div>
      )}

      {source === 'acs' && (
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="State (e.g., Rhode Island)" 
            value={stateCode} 
            onChange={(e) => setStateCode(e.target.value)} 
            style={{ width: '50%', padding: '4px' }}
          />
          <input 
            type="text" 
            placeholder="County (e.g., Providence)" 
            value={countyCode} 
            onChange={(e) => setCountyCode(e.target.value)} 
            style={{ width: '50%', padding: '4px' }}
          />
        </div>
      )}

      <button onClick={handleFetch} style={{ padding: '6px 12px', cursor: 'pointer', width: '100%' }}>
        Fetch Data
      </button>

      {error && <p style={{ color: '#d9534f', marginTop: '10px', fontWeight: 'bold' }}>{error}</p>}

      <div style={{ overflowY: 'auto', maxHeight: '300px', marginTop: '1rem' }}>
        {data.length > 0 && (
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }}>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {typeof row === 'object' && row !== null ? 
                    Object.values(row).map((cell: any, cellIndex) => (
                      <td key={cellIndex} style={{ border: '1px solid #ddd', padding: '6px' }}>
                        {typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
                      </td>
                    )) : 
                    <td style={{ border: '1px solid #ddd', padding: '6px' }}>{String(row)}</td>
                  }
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}