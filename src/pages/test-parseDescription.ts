// Test file for parseDescription function

const parseDescription = (text: string): { title: string; content: string }[] => {
  if (!text) return []
  
  const sections: { title: string; content: string }[] = []
  const lines = text.split('\n')
  
  // Find all line indices that start with -- and end with -- (these are section headers)
  const sectionStartIndices: number[] = []
  
  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('--') && trimmed.endsWith('--')) {
      sectionStartIndices.push(index)
    }
  })
  
  // If no headers found, return original text as single section
  if (sectionStartIndices.length === 0) {
    sections.push({
      title: 'Content',
      content: text
    })
    return sections
  }
  
  // Extract sections - each -- line is a title, content is until next -- line
  for (let i = 0; i < sectionStartIndices.length; i++) {
    const currentStart = sectionStartIndices[i]
    const nextStart = sectionStartIndices[i + 1]
    
    // Title is the -- line (remove the -- prefix and suffix)
    const title = lines[currentStart].trim().replace(/^--\s*/, '').replace(/\s*--$/, '')
    
    // Content is all lines until next -- line (or end)
    const contentLines = nextStart 
      ? lines.slice(currentStart + 1, nextStart)
      : lines.slice(currentStart + 1)
    const content = contentLines.join('\n').trim()
    
    sections.push({
      title,
      content
    })
  }
  
  return sections
}

// Test with the -- format
const testDescription = `-- Tajuk Utama --
Pes Sambal Segera Autentik Menggamit Memori 90an Dua Pilihan Tahap Kepedasan Sesuai Untuk Nasi Lemak

-- Caption --
Masak sambal guna pes ni terus teringat zaman kanak-kanak 90an dulu, rasa dia memang betul-betul authentic! Sangat serbaguna, nak buat sambal ikan bilis untuk makan dengan nasi lemak, buat cicah lempeng, atau roti canai pun padu.

-- SEO --
Pes sambal ikan bilis sedap, pes sambal nasi lemak viral, sambal tumis authentic 90an.`

const result = parseDescription(testDescription)
console.log('Parsed sections:', JSON.stringify(result, null, 2))

// Test with no -- headers
const noHeaderText = "This is just plain text without any -- headers"
const result2 = parseDescription(noHeaderText)
console.log('No header result:', JSON.stringify(result2, null, 2))