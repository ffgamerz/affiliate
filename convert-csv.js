import fs from 'fs'
import path from 'path'

// Read CSV file
const csvPath = path.join(process.cwd(), 'import.csv')
const csvContent = fs.readFileSync(csvPath, 'utf-8')

// Parse CSV properly (handle commas in values)
function parseCSV(content) {
  const lines = content.trim().split('\n')
  const result = []
  
  for (const line of lines) {
    const row = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        row.push(current)
        current = ''
      } else {
        current += char
      }
    }
    row.push(current)
    result.push(row)
  }
  
  return result
}

// Ensure all rows have the same number of columns as the header
function normalizeRows(rows) {
  const headerCount = rows[0].length
  return rows.map(row => {
    const normalized = [...row]
    while (normalized.length < headerCount) {
      normalized.push('')
    }
    return normalized
  })
}

const rows = parseCSV(csvContent)
const normalizedRows = normalizeRows(rows)

// Get header row to determine column indices
const headers = normalizedRows[0]
const columnMap = {}

// Map header names to column indices
headers.forEach((header, index) => {
  columnMap[header.trim()] = index
})

// Function to convert date from dd/mm/yyyy to yyyy-mm-dd
function convertDate(dateStr) {
  if (!dateStr || dateStr.trim() === '' || dateStr.trim() === '-') return null
  
  const trimmed = dateStr.trim()
  
  // Handle dd/mm/yyyy format
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) {
    const [, day, month, year] = match
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  
  // Already in yyyy-mm-dd format or other format
  return trimmed
}

// Function to escape SQL string
function escapeSql(str) {
  if (!str || str.trim() === '' || str.trim().toLowerCase() === 'null' || str.trim() === '-' || str.trim() === 'Z' || str.trim() === 'xxx' || str.trim().toLowerCase() === 'no stock' || str.trim() === 'link problem' || str.trim() === 'product link problem' || str.trim() === 'product tak support') return 'NULL'
  return `'${str.trim().replace(/'/g, "''")}'`
}

// Generate SQL
let sql = `-- Generated SQL for Supabase import
-- Table: videos
-- Total records: ${rows.length - 1}

INSERT INTO videos (
  title,
  description,
  created_at,
  tiktok_url,
  tiktok_upload_date,
  tiktok_product_url,
  youtube_url,
  youtube_upload_date,
  facebook_url,
  facebook_upload_date,
  instagram_url,
  instagram_upload_date,
  shopee_url,
  shopee_upload_date,
  shopee_product_url,
  threads_url,
  threads_upload_date
) VALUES
`

const values = []

for (let i = 1; i < normalizedRows.length; i++) {
  const columns = normalizedRows[i]
  
  // Get values based on column names
  const title = columns[columnMap['title']] || ''
  const tiktok_upload_date = convertDate(columns[columnMap['tiktok_upload_date']] || '')
  const tiktok_url = columns[columnMap['tiktok_url']] || ''
  const tiktok_product_url = columns[columnMap['tiktok_product_url']] || ''
  const youtube_upload_date = convertDate(columns[columnMap['youtube_upload_date']] || '')
  const youtube_url = columns[columnMap['youtube_url']] || ''
  const facebook_upload_date = convertDate(columns[columnMap['facebook_upload_date']] || '')
  const facebook_url = columns[columnMap['facebook_url']] || ''
  const instagram_upload_date = convertDate(columns[columnMap['instagram_upload_date']] || '')
  const instagram_url = columns[columnMap['instagram_url']] || ''
  const shopee_upload_date = convertDate(columns[columnMap['shopee_upload_date']] || '')
  const shopee_url = columns[columnMap['shopee_url']] || ''
  const shopee_product_url = columns[columnMap['shopee_product_url']] || ''
  const threads_upload_date = convertDate(columns[columnMap['threads_upload_date']] || '')
  const threads_url = columns[columnMap['threads_url']] || ''
  
  // Build value row - created_at uses CURRENT_DATE
  const valueRow = `(
    ${escapeSql(title)},
    NULL,
    CURRENT_DATE,
    ${escapeSql(tiktok_url)},
    ${tiktok_upload_date ? escapeSql(tiktok_upload_date) : 'NULL'},
    ${escapeSql(tiktok_product_url)},
    ${escapeSql(youtube_url)},
    ${youtube_upload_date ? escapeSql(youtube_upload_date) : 'NULL'},
    ${escapeSql(facebook_url)},
    ${facebook_upload_date ? escapeSql(facebook_upload_date) : 'NULL'},
    ${escapeSql(instagram_url)},
    ${instagram_upload_date ? escapeSql(instagram_upload_date) : 'NULL'},
    ${escapeSql(shopee_url)},
    ${shopee_upload_date ? escapeSql(shopee_upload_date) : 'NULL'},
    ${escapeSql(shopee_product_url)},
    ${escapeSql(threads_url)},
    ${threads_upload_date ? escapeSql(threads_upload_date) : 'NULL'}
  )`
  
  values.push(valueRow)
}

sql += values.join(',\n') + ';'

// Write output
const outputPath = path.join(process.cwd(), 'output.sql')
fs.writeFileSync(outputPath, sql)

console.log(`✅ Generated ${values.length} records to output.sql`)
console.log(`📋 Column mapping:`, columnMap)