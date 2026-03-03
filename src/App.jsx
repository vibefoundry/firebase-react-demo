import { useState, useEffect, useRef, useMemo } from 'react'
import * as XLSX from 'xlsx'
import './App.css'

function excelDateToISO(serial) {
  const utcDays = Math.floor(serial - 25569)
  const d = new Date(utcDays * 86400000)
  return d.toISOString().slice(0, 10)
}

function formatDate(serial) {
  if (!serial) return ''
  const iso = excelDateToISO(serial)
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}

function isDateColumn(header) {
  return header.toLowerCase().includes('date')
}

function App() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [columnFilters, setColumnFilters] = useState({})
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [dropdownSearch, setDropdownSearch] = useState('')
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetch('/sales_data/data.xlsx')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch data')
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

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveDropdown(null)
        setDropdownSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const headers = data.length > 0 ? Object.keys(data[0]) : []

  const uniqueValues = useMemo(() => {
    const result = {}
    headers.forEach((h) => {
      if (!isDateColumn(h)) {
        const vals = [...new Set(data.map((r) => String(r[h] ?? '')))]
        vals.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        result[h] = vals
      }
    })
    return result
  }, [data, headers])

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      return headers.every((h) => {
        const filter = columnFilters[h]
        if (!filter) return true
        if (isDateColumn(h)) {
          const { from, to } = filter
          if (!from && !to) return true
          const iso = row[h] ? excelDateToISO(row[h]) : null
          if (!iso) return false
          if (from && iso < from) return false
          if (to && iso > to) return false
          return true
        } else {
          if (filter.size === 0) return true
          return filter.has(String(row[h] ?? ''))
        }
      })
    })
  }, [data, headers, columnFilters])

  function toggleValue(header, value) {
    setColumnFilters((prev) => {
      let current
      if (prev[header]) {
        current = new Set(prev[header])
      } else {
        // No filter = all selected. Start with all values.
        current = new Set(uniqueValues[header])
      }
      if (current.has(value)) {
        current.delete(value)
      } else {
        current.add(value)
      }
      // If all values re-selected, remove the filter entirely
      if (current.size === uniqueValues[header]?.length) {
        const next = { ...prev }
        delete next[header]
        return next
      }
      return { ...prev, [header]: current }
    })
  }

  function selectAll(header) {
    setColumnFilters((prev) => {
      const next = { ...prev }
      delete next[header]
      return next
    })
  }

  function clearAll(header) {
    setColumnFilters((prev) => ({
      ...prev,
      [header]: new Set(['__none__']),
    }))
  }

  function setDateFilter(header, field, value) {
    setColumnFilters((prev) => {
      const current = prev[header] || { from: '', to: '' }
      const updated = { ...current, [field]: value }
      if (!updated.from && !updated.to) {
        const next = { ...prev }
        delete next[header]
        return next
      }
      return { ...prev, [header]: updated }
    })
  }

  function isFilterActive(header) {
    return !!columnFilters[header]
  }

  function openDropdown(header) {
    setActiveDropdown((prev) => (prev === header ? null : header))
    setDropdownSearch('')
  }

  if (loading) return <div className="loading">Loading VIP Data...</div>
  if (error) return <div className="error">Error: {error}</div>

  return (
    <div className="container">
      <h1>VIP Sales Data</h1>
      <span className="count">
        Showing {filteredData.length} of {data.length} records
      </span>
      <div className="table-wrapper">
        <table className="vip-table">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} className="filter-th">
                  <div className="th-content">
                    <span className="th-label">{header}</span>
                    <button
                      className={`filter-btn ${isFilterActive(header) ? 'active' : ''}`}
                      onClick={() => openDropdown(header)}
                      title="Filter"
                    >
                      &#9660;
                    </button>
                  </div>
                  {activeDropdown === header && (
                    <div className="filter-dropdown" ref={dropdownRef}>
                      {isDateColumn(header) ? (
                        <div className="date-filter">
                          <label>
                            From:
                            <input
                              type="date"
                              value={columnFilters[header]?.from || ''}
                              onChange={(e) =>
                                setDateFilter(header, 'from', e.target.value)
                              }
                            />
                          </label>
                          <label>
                            To:
                            <input
                              type="date"
                              value={columnFilters[header]?.to || ''}
                              onChange={(e) =>
                                setDateFilter(header, 'to', e.target.value)
                              }
                            />
                          </label>
                          <button
                            className="clear-dates-btn"
                            onClick={() => selectAll(header)}
                          >
                            Clear
                          </button>
                        </div>
                      ) : (
                        <div className="checkbox-filter">
                          <input
                            type="text"
                            className="dropdown-search"
                            placeholder="Search..."
                            value={dropdownSearch}
                            onChange={(e) => setDropdownSearch(e.target.value)}
                            autoFocus
                          />
                          <div className="select-actions">
                            <button onClick={() => selectAll(header)}>
                              Select All
                            </button>
                            <button onClick={() => clearAll(header)}>
                              Clear
                            </button>
                          </div>
                          <div className="checkbox-list">
                            {uniqueValues[header]
                              ?.filter((v) =>
                                v
                                  .toLowerCase()
                                  .includes(dropdownSearch.toLowerCase())
                              )
                              .map((value) => {
                                const checked = columnFilters[header]
                                  ? columnFilters[header].has(value)
                                  : true
                                return (
                                  <label key={value} className="checkbox-item">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() =>
                                        toggleValue(header, value)
                                      }
                                    />
                                    <span>{value || '(empty)'}</span>
                                  </label>
                                )
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {headers.map((header) => (
                  <td key={header}>
                    {isDateColumn(header)
                      ? formatDate(row[header])
                      : row[header]}
                  </td>
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
