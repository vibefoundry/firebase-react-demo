import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import './App.css'

function formatDate(iso) {
  if (!iso) return ''
  const d = iso.slice(0, 10)
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y}`
}

function App() {
  // File selection
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState('')

  // Schema from backend
  const [schema, setSchema] = useState(null)

  // Filters — { col: ["v1","v2"] } or { col: { from, to } }
  const [columnFilters, setColumnFilters] = useState({})

  // Dropdown unique values (fetched per-column, cascading)
  const [filterValues, setFilterValues] = useState({})

  // Paginated data
  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [offset, setOffset] = useState(0)
  const limit = 1000

  // UI
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [loadingValues, setLoadingValues] = useState(false)
  const [error, setError] = useState(null)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [dropdownSearch, setDropdownSearch] = useState('')
  const dropdownRef = useRef(null)

  // Columns that can be filtered (string + date, not numeric)
  const filterableColumns = useMemo(() => {
    if (!schema) return new Set()
    return new Set(
      schema.columns
        .filter((c) => c.type === 'string' || c.type === 'date')
        .map((c) => c.name)
    )
  }, [schema])

  // Serialize filters to JSON query param
  const filtersParam = useMemo(
    () => encodeURIComponent(JSON.stringify(columnFilters)),
    [columnFilters]
  )

  // ---- Effect 1: Load file list ----
  useEffect(() => {
    fetch('/api/files')
      .then((res) => (res.ok ? res.json() : []))
      .catch(() => [])
      .then((list) => {
        if (list.length === 0) list = ['data.xlsx']
        setFiles(list)
        setSelectedFile(list[0])
      })
  }, [])

  // ---- Effect 2: On file change → fetch schema, reset state ----
  useEffect(() => {
    if (!selectedFile) return
    setLoading(true)
    setError(null)
    setColumnFilters({})
    setFilterValues({})
    setOffset(0)
    setRows([])

    fetch(`/api/schema?file=${encodeURIComponent(selectedFile)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load schema')
        return res.json()
      })
      .then((data) => {
        setSchema(data)
        setTotalCount(data.row_count)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [selectedFile])

  // ---- Effect 3: On filter/offset change → fetch data + count ----
  useEffect(() => {
    if (!selectedFile || !schema) return
    const controller = new AbortController()
    setLoadingData(true)

    Promise.all([
      fetch(
        `/api/data?file=${encodeURIComponent(selectedFile)}&filters=${filtersParam}&offset=${offset}&limit=${limit}`,
        { signal: controller.signal }
      ).then((r) => r.json()),
      fetch(
        `/api/count?file=${encodeURIComponent(selectedFile)}&filters=${filtersParam}`,
        { signal: controller.signal }
      ).then((r) => r.json()),
    ])
      .then(([dataRes, countRes]) => {
        setRows(dataRes.rows)
        setTotalCount(countRes.total)
        setLoadingData(false)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err.message)
          setLoadingData(false)
        }
      })

    return () => controller.abort()
  }, [selectedFile, schema, filtersParam, offset, limit])

  // ---- Effect 4: On dropdown open → fetch cascading values ----
  useEffect(() => {
    if (!activeDropdown || !selectedFile) return
    setLoadingValues(true)

    fetch(
      `/api/values/${encodeURIComponent(activeDropdown)}?file=${encodeURIComponent(selectedFile)}&filters=${filtersParam}`
    )
      .then((res) => res.json())
      .then((data) => {
        setFilterValues((prev) => ({ ...prev, [activeDropdown]: data.values }))
        setLoadingValues(false)
      })
      .catch(() => setLoadingValues(false))
  }, [activeDropdown, selectedFile, filtersParam])

  // ---- Effect 5: Close dropdown on click outside ----
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

  // ---- Filter actions ----
  const isDateColumn = useCallback(
    (col) => schema?.columns.find((c) => c.name === col)?.type === 'date',
    [schema]
  )

  function toggleValue(header, value) {
    setColumnFilters((prev) => {
      const allValues = filterValues[header] || []
      let selected = prev[header] ? [...prev[header]] : [...allValues]

      const idx = selected.indexOf(value)
      if (idx >= 0) {
        selected.splice(idx, 1)
      } else {
        selected.push(value)
      }

      // If all values re-selected, remove filter entirely
      if (selected.length >= allValues.length) {
        const next = { ...prev }
        delete next[header]
        return next
      }
      return { ...prev, [header]: selected }
    })
    setOffset(0)
  }

  function selectAll(header) {
    setColumnFilters((prev) => {
      const next = { ...prev }
      delete next[header]
      return next
    })
    setOffset(0)
  }

  function clearAll(header) {
    setColumnFilters((prev) => ({
      ...prev,
      [header]: [],
    }))
    setOffset(0)
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
    setOffset(0)
  }

  function isFilterActive(header) {
    return !!columnFilters[header]
  }

  function openDropdown(header) {
    setActiveDropdown((prev) => (prev === header ? null : header))
    setDropdownSearch('')
  }

  // ---- Pagination ----
  const totalPages = Math.max(1, Math.ceil(totalCount / limit))
  const currentPage = Math.floor(offset / limit) + 1

  // ---- Render ----
  if (loading) return <div className="loading">Loading...</div>
  if (error) return <div className="error">Error: {error}</div>
  if (!schema) return null

  return (
    <div className="container">
      <h1>VIP Sales Data</h1>
      <div className="toolbar">
        <select
          className="file-select"
          value={selectedFile}
          onChange={(e) => setSelectedFile(e.target.value)}
        >
          {files.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <span className="count">
          {loadingData ? 'Loading...' : `Showing ${rows.length} of ${totalCount} records`}
        </span>
      </div>
      <div className="table-wrapper">
        <table className="vip-table">
          <thead>
            <tr>
              {schema.columns.map((col) => (
                <th key={col.name} className="filter-th">
                  <div className="th-content">
                    <span className="th-label">{col.name}</span>
                    {filterableColumns.has(col.name) && (
                      <button
                        className={`filter-btn ${isFilterActive(col.name) ? 'active' : ''}`}
                        onClick={() => openDropdown(col.name)}
                        title="Filter"
                      >
                        &#9660;
                      </button>
                    )}
                  </div>
                  {activeDropdown === col.name && (
                    <div className="filter-dropdown" ref={dropdownRef}>
                      {isDateColumn(col.name) ? (
                        <div className="date-filter">
                          <label>
                            From:
                            <input
                              type="date"
                              value={columnFilters[col.name]?.from || ''}
                              onChange={(e) =>
                                setDateFilter(col.name, 'from', e.target.value)
                              }
                            />
                          </label>
                          <label>
                            To:
                            <input
                              type="date"
                              value={columnFilters[col.name]?.to || ''}
                              onChange={(e) =>
                                setDateFilter(col.name, 'to', e.target.value)
                              }
                            />
                          </label>
                          <button
                            className="clear-dates-btn"
                            onClick={() => selectAll(col.name)}
                          >
                            Clear
                          </button>
                        </div>
                      ) : loadingValues ? (
                        <div className="dropdown-loading">Loading values...</div>
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
                            <button onClick={() => selectAll(col.name)}>
                              Select All
                            </button>
                            <button onClick={() => clearAll(col.name)}>
                              Clear
                            </button>
                          </div>
                          <div className="checkbox-list">
                            {(filterValues[col.name] || [])
                              .filter((v) =>
                                v
                                  .toLowerCase()
                                  .includes(dropdownSearch.toLowerCase())
                              )
                              .map((value) => {
                                const selected = columnFilters[col.name]
                                const checked = selected
                                  ? selected.includes(value)
                                  : true
                                return (
                                  <label key={value} className="checkbox-item">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() =>
                                        toggleValue(col.name, value)
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
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {schema.columns.map((col) => (
                  <td key={col.name}>
                    {col.type === 'date'
                      ? formatDate(row[col.name])
                      : row[col.name] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <button
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - limit))}
        >
          Previous
        </button>
        <span className="page-info">
          Page {currentPage} of {totalPages} ({totalCount.toLocaleString()} total)
        </span>
        <button
          disabled={offset + limit >= totalCount}
          onClick={() => setOffset(offset + limit)}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default App
