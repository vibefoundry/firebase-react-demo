import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import './App.css'

function App() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetch('/sales_data/data.xlsx')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch data')
        }
        return response.arrayBuffer()
      })
      .then((buffer) => {
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        setData(jsonData)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const filteredData = data.filter((row) =>
    Object.values(row).some((val) =>
      String(val).toLowerCase().includes(filter.toLowerCase())
    )
  )

  if (loading) return <div className="loading">Loading VIP Data...</div>
  if (error) return <div className="error">Error: {error}</div>

  const headers = data.length > 0 ? Object.keys(data[0]) : []

  return (
    <div className="container">
      <h1>VIP Sales Data</h1>
      <div className="filter-container">
        <input
          type="text"
          placeholder="Filter data..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-input"
        />
        <span className="count">Showing {filteredData.length} of {data.length} records</span>
      </div>
      <div className="table-wrapper">
        <table className="vip-table">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {headers.map((header) => (
                  <td key={header}>{row[header]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default App
